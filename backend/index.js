const dotenv = require('dotenv');
const path = require('node:path');

// dotenv must be loaded before any local module accesses process.env
dotenv.config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { uploadDir, siteUrl } = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const contentRouter = require('./routes/content');
const uploadsRouter = require('./routes/uploads');
const adminRouter = require('./routes/admin');
const webhookRouter = require('./routes/webhook');

const logger = require('./logger');

const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [siteUrl]
  : [siteUrl, 'http://localhost:4200', 'http://localhost:4000'];
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use('/uploads', express.static(uploadDir));

// Webhook must be registered before express.json() to receive the raw body
app.use('/api/payments/stripe', webhookRouter);

app.use(express.json({ limit: '100kb' }));

const { publicReadLimiter } = require('./middleware/auth');

app.use('/api/products', publicReadLimiter, productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/content', publicReadLimiter, contentRouter);
app.use('/api/admin', adminRouter);
app.use('/api', uploadsRouter);

app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    logger.info(`API disponível em http://localhost:${port}`);
  });
}

module.exports = app;