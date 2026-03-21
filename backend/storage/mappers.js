const { orderStatusSchema } = require('../schemas');

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

module.exports = {
  mapProductRow,
  serializeProduct,
  mapContentRow,
  mapOrderRow,
  serializeOrder,
  serializeOrderPatch
};
