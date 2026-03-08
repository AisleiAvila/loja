const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const dataFile = path.join(__dirname, 'data', 'store.json');
const siteUrl = (process.env.SITE_URL || 'http://localhost:4200').replace(/\/$/, '');
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminToken = process.env.ADMIN_TOKEN || 'local-admin-token';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
  res.json({
    ok: true,
    storage: supabase ? 'supabase' : 'local-json',
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

    const savedProduct = await saveProduct(updatedProduct);
    return res.json(savedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Produto inválido.', issues: error.issues });
    }

    return res.status(500).json({ message: 'Erro interno ao atualizar produto.' });
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

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});

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