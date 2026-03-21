const express = require('express');
const { stripe, stripeWebhookSecret } = require('../config');
const { updateOrder } = require('../services/orderService');
const { sendConfirmationEmail } = require('../services/emailService');

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(404).json({ message: 'Stripe webhook não configurado.' });
  }

  const signature = req.header('stripe-signature');

  if (!signature) {
    return res.status(400).json({ message: 'Cabeçalho Stripe-Signature em falta.' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const updatedOrder = await updateOrder(orderId, {
          status: 'paid',
          paymentProvider: 'stripe',
          paymentReference: String(session.payment_intent || session.id),
          paymentUrl: session.url || null
        });

        if (updatedOrder) {
          await sendConfirmationEmail(updatedOrder, 'paid');
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await updateOrder(orderId, {
          status: 'failed',
          paymentProvider: 'stripe',
          paymentReference: String(session.id),
          paymentUrl: session.url || null
        });
      }
    }

    return res.json({ received: true });
  } catch {
    return res.status(500).json({ message: 'Erro interno ao processar o webhook.' });
  }
});

module.exports = router;
