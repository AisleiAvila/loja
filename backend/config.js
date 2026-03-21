const crypto = require('node:crypto');
const path = require('node:path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const dataFile = path.join(__dirname, 'data', 'store.json');
const uploadDir = path.join(__dirname, 'data', 'uploads');

const siteUrl = (process.env.SITE_URL || 'http://localhost:4200').replace(/\/$/, '');
const adminPassword = process.env.ADMIN_PASSWORD ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD is required in production.');
  }
  console.warn('[warn] ADMIN_PASSWORD não definido — usando valor padrão inseguro. Defina a variável de ambiente em produção.');
  return 'admin123';
})();

const jwtSecret = process.env.JWT_SECRET ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  console.warn('[warn] JWT_SECRET não definido — usando chave volátil. Os tokens expiram ao reiniciar o servidor.');
  return crypto.randomBytes(32).toString('hex');
})();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN;

const stripePaymentMethodTypes = (process.env.STRIPE_PAYMENT_METHOD_TYPES || 'card')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const invalidImageTypeMessage = 'Apenas imagens JPG, PNG, WebP e SVG são permitidas.';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      callback(new Error(invalidImageTypeMessage));
      return;
    }
    callback(null, true);
  }
});

module.exports = {
  dataFile,
  uploadDir,
  siteUrl,
  adminPassword,
  jwtSecret,
  supabaseUrl,
  stripeWebhookSecret,
  blobReadWriteToken,
  stripePaymentMethodTypes,
  supabase,
  stripe,
  invalidImageTypeMessage,
  upload
};
