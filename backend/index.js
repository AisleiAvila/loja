const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const multer = require('multer');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const { del, get, put } = require('@vercel/blob');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 3000);
const dataFile = path.join(__dirname, 'data', 'store.json');
const uploadDir = path.join(__dirname, 'data', 'uploads');
const siteUrl = (process.env.SITE_URL || 'http://localhost:4200').replace(/\/$/, '');
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminToken = process.env.ADMIN_TOKEN || 'local-admin-token';
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

const assetUrlSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), {
    message: 'Use uma URL absoluta ou caminho relativo público.'
  });

const optionalAssetSchema = z.union([assetUrlSchema, z.literal('')]).optional();

const orderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  customerName: z.string().min(2),
  email: z.email(),
  phone: z.string().min(6),
  address: z.string().min(4),
  postalCode: z.string().min(4),
  city: z.string().min(2),
  paymentMethod: z.string().min(2),
  notes: z.string().optional().default('')
});

const orderStatusSchema = z.enum(['pending', 'awaiting_payment', 'paid', 'failed']);

const productSchema = z.object({
  id: z.string(),
  slug: z.string().min(2),
  name: z.string().min(2),
  shortDescription: z.string().min(2),
  description: z.string().min(2),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().optional(),
  images: z.array(assetUrlSchema).min(1),
  videoUrl: optionalAssetSchema,
  benefits: z.array(z.string()).min(1),
  featured: z.boolean().optional(),
  badge: z.string().optional()
});

const newProductSchema = productSchema.omit({ id: true }).extend({
  id: z.string().optional()
});

const contentSchema = z.object({
  brand: z.object({
    name: z.string(),
    tagline: z.string(),
    headline: z.string(),
    heroVideoUrl: optionalAssetSchema,
    heroPosterUrl: assetUrlSchema
  }),
  about: z.object({
    story: z.string(),
    mission: z.string(),
    values: z.array(z.string()).min(1)
  }),
  contact: z.object({
    email: z.email(),
    phone: z.string(),
    address: z.string(),
    whatsapp: z.string()
  })
});

app.use(cors({ origin: true, credentials: true }));
app.use('/uploads', express.static(uploadDir));

app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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

app.use(express.json());

app.get('/api/health', (_req, res) => {
  let assetStorage = 'local-filesystem';

  if (blobReadWriteToken) {
    assetStorage = 'vercel-blob';
  }

  res.json({
    ok: true,
    storage: supabase ? 'supabase' : 'local-json',
    assetStorage,
    payments: stripe ? 'stripe' : 'offline'
  });
});

app.get('/api/products', async (_req, res) => {
  const products = await listProducts();
  res.json(products);
});

app.get('/api/products/:slug', async (req, res) => {
  const product = await getProductBySlug(req.params.slug);

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  return res.json(product);
});

app.get('/api/content', async (_req, res) => {
  const content = await getContent();
  res.json(content);
});

app.get('/api/orders/:id/summary', async (req, res) => {
  const order = await getOrderById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Pedido não encontrado.' });
  }

  return res.json(order);
});

app.post('/api/orders', async (req, res) => {
  try {
    const payload = orderSchema.parse(req.body);
    const product = await getProductById(payload.productId);

    if (!product) {
      return res.status(400).json({ message: 'Produto inválido.' });
    }

    const createdOrder = await createOrder({
      id: crypto.randomUUID().split('-')[0].toUpperCase(),
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: error.issues });
    }

    return res.status(500).json({ message: 'Erro interno ao criar o pedido.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  if (req.body?.password !== adminPassword) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  return res.json({ token: adminToken });
});

app.get('/api/orders', ensureAdmin, async (_req, res) => {
  const orders = await listOrders();
  res.json(orders);
});

app.post('/api/uploads/image', ensureAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
    }

    const fileExtension = getImageExtension(req.file);
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${fileExtension}`;

    if (blobReadWriteToken) {
      const blobPathname = `products/${fileName}`;

      try {
        const blob = await put(blobPathname, req.file.buffer, {
          access: 'public',
          addRandomSuffix: false,
          contentType: req.file.mimetype,
          token: blobReadWriteToken
        });

        return res.status(201).json({ url: blob.url });
      } catch (error) {
        if (!isPrivateBlobStoreError(error)) {
          throw error;
        }

        await put(blobPathname, req.file.buffer, {
          access: 'private',
          addRandomSuffix: false,
          contentType: req.file.mimetype,
          token: blobReadWriteToken
        });

        return res.status(201).json({ url: buildManagedBlobProxyUrl(blobPathname) });
      }
    }

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), req.file.buffer);

    return res.status(201).json({ url: `/uploads/${fileName}` });
  } catch (error) {
    return next(error);
  }
});

app.get(/^\/api\/assets\/blob\/(.+)$/, async (req, res, next) => {
  try {
    if (!blobReadWriteToken) {
      return res.status(404).json({ message: 'Storage de imagens não configurado.' });
    }

    const blobPathname = decodeManagedBlobPathname(req.params[0]);

    if (!blobPathname) {
      return res.status(400).json({ message: 'Asset inválido.' });
    }

    const asset = await get(blobPathname, {
      access: 'private',
      token: blobReadWriteToken
    });

    if (!asset || asset.statusCode !== 200 || !asset.stream) {
      return res.status(404).json({ message: 'Asset não encontrado.' });
    }

    res.setHeader('Content-Type', asset.blob.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', asset.blob.cacheControl || 'public, max-age=3600');
    res.setHeader('Content-Disposition', asset.blob.contentDisposition || 'inline');
    Readable.fromWeb(asset.stream).pipe(res);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/uploads/image', ensureAdmin, async (req, res, next) => {
  try {
    const assetUrl = typeof req.body?.url === 'string' ? req.body.url : '';

    if (!assetUrl) {
      return res.status(400).json({ message: 'URL do asset em falta.' });
    }

    const deleted = await deleteManagedAsset(assetUrl);

    if (!deleted) {
      return res.status(400).json({ message: 'O asset indicado não é gerido pela aplicação.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/products', ensureAdmin, async (req, res) => {
  try {
    const payload = newProductSchema.parse(req.body);
    const productId = normalizeProductId(payload.id || payload.slug || payload.name);

    if (!productId) {
      return res.status(400).json({ message: 'Não foi possível gerar um identificador para o produto.' });
    }

    const existingById = await getProductById(productId);

    if (existingById) {
      return res.status(409).json({ message: 'Já existe um produto com este identificador.' });
    }

    const existingBySlug = await getProductBySlug(payload.slug);

    if (existingBySlug) {
      return res.status(409).json({ message: 'Já existe um produto com este slug.' });
    }

    const createdProduct = productSchema.parse({
      ...payload,
      id: productId
    });

    const savedProduct = await saveProduct(createdProduct);
    return res.status(201).json(savedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Produto inválido.', issues: error.issues });
    }

    return res.status(500).json({ message: 'Erro interno ao criar produto.' });
  }
});

app.put('/api/products/:id', ensureAdmin, async (req, res) => {
  try {
    const existingProduct = await getProductById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const updatedProduct = productSchema.parse({
      ...existingProduct,
      ...req.body
    });

    const conflictingProduct = await getProductBySlug(updatedProduct.slug);

    if (conflictingProduct && conflictingProduct.id !== existingProduct.id) {
      return res.status(409).json({ message: 'Já existe um produto com este slug.' });
    }

    const savedProduct = await saveProduct(updatedProduct);
    return res.json(savedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Produto inválido.', issues: error.issues });
    }

    return res.status(500).json({ message: 'Erro interno ao atualizar produto.' });
  }
});

app.delete('/api/products/:id', ensureAdmin, async (req, res, next) => {
  try {
    const existingProduct = await getProductById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    if (await hasOrdersForProduct(req.params.id)) {
      return res.status(409).json({ message: 'Não é possível apagar um produto com pedidos associados.' });
    }

    await deleteManagedAssets(existingProduct.images);

    const deletedProduct = await deleteProduct(req.params.id);
    return res.json(deletedProduct);
  } catch (error) {
    return next(error);
  }
});

app.put('/api/content', ensureAdmin, async (req, res) => {
  try {
    const updatedContent = contentSchema.parse(req.body);
    const savedContent = await saveContent(updatedContent);
    return res.json(savedContent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Conteúdo inválido.', issues: error.issues });
    }

    return res.status(500).json({ message: 'Erro interno ao atualizar conteúdo.' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API disponível em http://localhost:${port}`);
  });
}

module.exports = app;

async function listProducts() {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').order('name');

    if (!error && data?.length) {
      return data.map(mapProductRow);
    }
  }

  const store = await readLocalStore();
  return store.products;
}

async function getProductBySlug(slug) {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();

    if (!error && data) {
      return mapProductRow(data);
    }
  }

  const store = await readLocalStore();
  return store.products.find((product) => product.slug === slug) || null;
}

async function getProductById(productId) {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();

    if (!error && data) {
      return mapProductRow(data);
    }
  }

  const store = await readLocalStore();
  return store.products.find((product) => product.id === productId) || null;
}

async function getContent() {
  if (supabase) {
    const { data, error } = await supabase.from('site_content').select('*').eq('id', 'default').maybeSingle();

    if (!error && data) {
      return mapContentRow(data);
    }
  }

  const store = await readLocalStore();
  return store.content;
}

async function listOrders() {
  if (supabase) {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(mapOrderRow);
    }
  }

  const store = await readLocalStore();
  return store.orders;
}

async function getOrderById(orderId) {
  if (supabase) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();

    if (!error && data) {
      return mapOrderRow(data);
    }
  }

  const store = await readLocalStore();
  return store.orders.find((order) => order.id === orderId) || null;
}

async function hasOrdersForProduct(productId) {
  if (supabase) {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (!error) {
      return Boolean(count);
    }
  }

  const store = await readLocalStore();
  return store.orders.some((order) => order.productId === productId);
}

async function createOrder(order) {
  if (supabase) {
    const { data, error } = await supabase.from('orders').insert(serializeOrder(order)).select().single();

    if (!error && data) {
      return mapOrderRow(data);
    }
  }

  const store = await readLocalStore();
  store.orders.unshift(order);
  await writeLocalStore(store);
  return order;
}

async function updateOrder(orderId, patch) {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update(serializeOrderPatch(patch))
      .eq('id', orderId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return mapOrderRow(data);
    }
  }

  const store = await readLocalStore();
  const orderIndex = store.orders.findIndex((order) => order.id === orderId);

  if (orderIndex === -1) {
    return null;
  }

  store.orders[orderIndex] = {
    ...store.orders[orderIndex],
    ...patch
  };

  await writeLocalStore(store);
  return store.orders[orderIndex];
}

async function saveProduct(product) {
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .upsert(serializeProduct(product), { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      return mapProductRow(data);
    }
  }

  const store = await readLocalStore();
  const index = store.products.findIndex((item) => item.id === product.id);

  if (index === -1) {
    store.products.push(product);
  } else {
    store.products[index] = product;
  }

  await writeLocalStore(store);
  return product;
}

async function deleteProduct(productId) {
  if (supabase) {
    const { data, error } = await supabase.from('products').delete().eq('id', productId).select().maybeSingle();

    if (!error && data) {
      return mapProductRow(data);
    }
  }

  const store = await readLocalStore();
  const productIndex = store.products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return null;
  }

  const [removedProduct] = store.products.splice(productIndex, 1);
  await writeLocalStore(store);
  return removedProduct;
}

async function deleteManagedAsset(assetUrl) {
  if (isLocalUploadAsset(assetUrl)) {
    const fileName = path.basename(assetUrl);
    const absoluteFilePath = path.join(uploadDir, fileName);

    await fs.rm(absoluteFilePath, { force: true });
    return true;
  }

  const managedBlobPathname = getManagedBlobPathname(assetUrl);

  if (blobReadWriteToken && managedBlobPathname) {
    await del(managedBlobPathname, { token: blobReadWriteToken });
    return true;
  }

  if (blobReadWriteToken && isVercelBlobAsset(assetUrl)) {
    await del(assetUrl, { token: blobReadWriteToken });
    return true;
  }

  if (supabase) {
    const supabaseAssetPath = getSupabaseStorageAssetPath(assetUrl);

    if (supabaseAssetPath) {
      const { error } = await supabase.storage.from('product-assets').remove([supabaseAssetPath]);

      if (!error) {
        return true;
      }
    }
  }

  return false;
}

async function deleteManagedAssets(assetUrls) {
  for (const assetUrl of assetUrls) {
    try {
      await deleteManagedAsset(assetUrl);
    } catch {
      // Ignore orphan-cleanup failures to avoid blocking the main operation.
    }
  }
}

async function saveContent(content) {
  if (supabase) {
    const { data, error } = await supabase
      .from('site_content')
      .upsert(
        {
          id: 'default',
          brand: content.brand,
          about: content.about,
          contact: content.contact
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (!error && data) {
      return mapContentRow(data);
    }
  }

  const store = await readLocalStore();
  store.content = content;
  await writeLocalStore(store);
  return content;
}

async function readLocalStore() {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

async function writeLocalStore(store) {
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}

function normalizeProductId(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '');
}

function getImageExtension(file) {
  const extensionByMimeType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  };

  const extensionFromMimeType = extensionByMimeType[file.mimetype];

  if (extensionFromMimeType) {
    return extensionFromMimeType;
  }

  return path.extname(file.originalname || '').toLowerCase() || '.bin';
}

function isLocalUploadAsset(assetUrl) {
  return typeof assetUrl === 'string' && assetUrl.startsWith('/uploads/');
}

function getSupabaseStorageAssetPath(assetUrl) {
  if (!supabaseUrl || typeof assetUrl !== 'string' || !/^https?:\/\//.test(assetUrl)) {
    return null;
  }

  try {
    const parsedAssetUrl = new URL(assetUrl);
    const expectedPrefix = '/storage/v1/object/public/product-assets/';

    if (!parsedAssetUrl.href.startsWith(supabaseUrl)) {
      return null;
    }

    if (!parsedAssetUrl.pathname.startsWith(expectedPrefix)) {
      return null;
    }

    return decodeURIComponent(parsedAssetUrl.pathname.slice(expectedPrefix.length));
  } catch {
    return null;
  }
}

function isVercelBlobAsset(assetUrl) {
  if (typeof assetUrl !== 'string' || !/^https?:\/\//.test(assetUrl)) {
    return false;
  }

  try {
    const hostname = new URL(assetUrl).hostname;
    return hostname.includes('blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function buildManagedBlobProxyUrl(blobPathname) {
  return `/api/assets/blob/${encodeManagedBlobPathname(blobPathname)}`;
}

function getManagedBlobPathname(assetUrl) {
  if (typeof assetUrl !== 'string' || !assetUrl) {
    return null;
  }

  const proxyPathPrefix = '/api/assets/blob/';

  if (assetUrl.startsWith(proxyPathPrefix)) {
    return decodeManagedBlobPathname(assetUrl.slice(proxyPathPrefix.length));
  }

  if (!/^https?:\/\//.test(assetUrl)) {
    return null;
  }

  try {
    const parsedAssetUrl = new URL(assetUrl);

    if (!parsedAssetUrl.pathname.startsWith(proxyPathPrefix)) {
      return null;
    }

    return decodeManagedBlobPathname(parsedAssetUrl.pathname.slice(proxyPathPrefix.length));
  } catch {
    return null;
  }
}

function encodeManagedBlobPathname(blobPathname) {
  return String(blobPathname || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodeManagedBlobPathname(encodedBlobPathname) {
  if (typeof encodedBlobPathname !== 'string' || !encodedBlobPathname.trim()) {
    return null;
  }

  try {
    const pathname = encodedBlobPathname
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');

    if (!pathname || pathname.includes('..')) {
      return null;
    }

    return pathname;
  } catch {
    return null;
  }
}

function isPrivateBlobStoreError(error) {
  return error instanceof Error && error.message.includes('Cannot use public access on a private store');
}

function ensureAdmin(req, res, next) {
  const authorization = req.header('authorization') || '';

  if (authorization !== `Bearer ${adminToken}`) {
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  }

  return next();
}

function mapProductRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    images: row.images || [],
    videoUrl: row.video_url || '',
    benefits: row.benefits || [],
    featured: Boolean(row.featured),
    badge: row.badge || undefined
  };
}

function serializeProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    short_description: product.shortDescription,
    description: product.description,
    price: product.price,
    compare_at_price: product.compareAtPrice || null,
    images: product.images,
    video_url: product.videoUrl || null,
    benefits: product.benefits,
    featured: Boolean(product.featured),
    badge: product.badge || null
  };
}

function mapContentRow(row) {
  return {
    brand: row.brand,
    about: row.about,
    contact: row.contact
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    paymentMethod: row.payment_method,
    notes: row.notes || '',
    productName: row.product_name,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
    paymentProvider: row.payment_provider || undefined,
    paymentReference: row.payment_reference || undefined,
    paymentUrl: row.payment_url || undefined
  };
}

function serializeOrder(order) {
  return {
    id: order.id,
    product_id: order.productId,
    quantity: order.quantity,
    customer_name: order.customerName,
    email: order.email,
    phone: order.phone,
    address: order.address,
    postal_code: order.postalCode,
    city: order.city,
    payment_method: order.paymentMethod,
    notes: order.notes || '',
    product_name: order.productName,
    total: order.total,
    status: order.status,
    created_at: order.createdAt,
    payment_provider: order.paymentProvider || null,
    payment_reference: order.paymentReference || null,
    payment_url: order.paymentUrl || null
  };
}

function serializeOrderPatch(patch) {
  const serialized = {};

  if (patch.status) serialized.status = orderStatusSchema.parse(patch.status);
  if (Object.hasOwn(patch, 'paymentProvider')) serialized.payment_provider = patch.paymentProvider || null;
  if (Object.hasOwn(patch, 'paymentReference')) serialized.payment_reference = patch.paymentReference || null;
  if (Object.hasOwn(patch, 'paymentUrl')) serialized.payment_url = patch.paymentUrl || null;

  return serialized;
}

function buildAbsoluteAssetUrl(assetPath) {
  if (!assetPath) {
    return undefined;
  }

  if (/^https?:\/\//.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${siteUrl}${normalizedPath}`;
}

async function sendConfirmationEmail(order, stage) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

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

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'A imagem deve ter no máximo 5 MB.' });
    }

    return res.status(400).json({ message: 'Erro ao processar upload da imagem.' });
  }

  if (error?.message === invalidImageTypeMessage) {
    return res.status(400).json({ message: invalidImageTypeMessage });
  }

  console.error('Erro não tratado na API:', error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
});