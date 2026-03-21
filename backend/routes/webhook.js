const express = require('express');
const { stripe, stripeWebhookSecret } = require('../config');
const logger = require('../logger');
const { updateOrder } = require('../services/orderService');
const { sendConfirmationEmail } = require('../services/emailService');

const router = express.Router();

// In-memory idempotency cache — prevents duplicate processing of Stripe events
const processedEvents = new Map();
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

function pruneProcessedEvents() {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
  for (const [id, timestamp] of processedEvents) {
    if (timestamp < cutoff) processedEvents.delete(id);
  }
}

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
    return res.status(400).json({ message: 'Assinatura de webhook inválida.' });
  }

  // Idempotency check — skip already-processed events
  if (processedEvents.has(event.id)) {
    return res.json({ received: true, duplicate: true });
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

    processedEvents.set(event.id, Date.now());
    pruneProcessedEvents();

    return res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', { eventId: event?.id, error: error.message });
    return res.status(500).json({ message: 'Erro interno ao processar o webhook.' });
  }
});

module.exports = router;
