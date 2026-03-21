const nodemailer = require('nodemailer');

const transporter = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

async function sendConfirmationEmail(order, stage) {
  if (!transporter) {
    return;
  }

  const subject = stage === 'paid'
    ? `Pagamento confirmado para a encomenda ${order.id}`
    : `Recebemos a sua encomenda ${order.id}`;

  const paymentLine = order.paymentUrl
    ? `Pode concluir o pagamento em: ${order.paymentUrl}`
    : `Método de pagamento escolhido: ${order.paymentMethod}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.email,
    subject,
    text: [
      `Obrigado pela sua compra, ${order.customerName}.`,
      `Produto: ${order.productName}`,
      `Total: ${order.total} EUR`,
      `Estado: ${order.status}`,
      paymentLine
    ].join('\n')
  });
}

module.exports = { sendConfirmationEmail };
