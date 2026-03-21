const dotenv = require('dotenv');
const path = require('node:path');

// dotenv must be loaded before any local module accesses process.env
dotenv.config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const express = require('express');
const { uploadDir } = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const contentRouter = require('./routes/content');
const uploadsRouter = require('./routes/uploads');
const adminRouter = require('./routes/admin');
const webhookRouter = require('./routes/webhook');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({ origin: true, credentials: true }));
app.use('/uploads', express.static(uploadDir));

// Webhook must be registered before express.json() to receive the raw body
app.use('/api/payments/stripe', webhookRouter);

app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin', adminRouter);
app.use('/api', uploadsRouter);

app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API disponível em http://localhost:${port}`);
  });
}

module.exports = app;