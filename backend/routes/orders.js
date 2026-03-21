const crypto = require('node:crypto');
const express = require('express');
const { stripe, siteUrl, stripePaymentMethodTypes } = require('../config');
const { orderSchema } = require('../schemas');
const { buildAbsoluteAssetUrl } = require('../storage/assets');
const { ensureAdmin, orderLimiter, publicReadLimiter } = require('../middleware/auth');
const { listOrders, getOrderById, createOrder, updateOrder } = require('../services/orderService');
const { getProductById } = require('../services/productService');
const { sendConfirmationEmail } = require('../services/emailService');

const router = express.Router();

router.get('/:id/summary', publicReadLimiter, async (req, res, next) => {
  try {
    const orderId = req.params.id;

    // Reject IDs that don't match the expected format to avoid enumeration probing
    if (!/^[A-Z0-9]{8}$/.test(orderId)) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    // Return only the minimal fields needed by the thank-you page — no PII, no payment URLs/references
    const { id, productName, quantity, total, status, createdAt, paymentMethod } = order;
    return res.json({ id, productName, quantity, total, status, createdAt, paymentMethod });
  } catch (error) {
    return next(error);
  }
});

router.post('/', orderLimiter, async (req, res, next) => {
  try {
    const payload = orderSchema.parse(req.body);
    const product = await getProductById(payload.productId);

    if (!product) {
      return res.status(400).json({ message: 'Produto inválido.' });
    }

    const createdOrder = await createOrder({
      id: crypto.randomBytes(4).toString('hex').toUpperCase(),
      ...payload,
      productName: product.name,
      total: Number((product.price * payload.quantity).toFixed(2)),
      status: payload.paymentMethod === 'card' && stripe ? 'awaiting_payment' : 'pending',
      createdAt: new Date().toISOString(),
      paymentProvider: payload.paymentMethod === 'card' && stripe ? 'stripe' : 'manual',
      paymentReference: '',
      paymentUrl: ''
    });

    if (payload.paymentMethod === 'card' && stripe) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${siteUrl}/obrigado?orderId=${createdOrder.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/checkout?product=${product.id}&cancelled=1`,
        customer_email: payload.email,
        locale: 'pt',
        payment_method_types: stripePaymentMethodTypes,
        line_items: [
          {
            quantity: payload.quantity,
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(product.price * 100),
              product_data: {
                name: product.name,
                description: product.shortDescription,
                images: product.images.length ? [buildAbsoluteAssetUrl(product.images[0])] : undefined
              }
            }
          }
        ],
        metadata: {
          orderId: createdOrder.id,
          productId: product.id
        }
      });

      const updatedOrder = await updateOrder(createdOrder.id, {
        status: 'awaiting_payment',
        paymentProvider: 'stripe',
        paymentReference: session.id,
        paymentUrl: session.url || ''
      });

      return res.status(201).json({
        order: updatedOrder || createdOrder,
        redirectUrl: session.url,
        paymentProvider: 'stripe'
      });
    }

    await sendConfirmationEmail(createdOrder, 'received');

    return res.status(201).json({
      order: createdOrder,
      redirectUrl: `${siteUrl}/obrigado?orderId=${createdOrder.id}`,
      paymentProvider: 'manual'
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/', ensureAdmin, async (_req, res, next) => {
  try {
    const orders = await listOrders();
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
