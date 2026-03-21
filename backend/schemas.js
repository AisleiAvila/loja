const { z } = require('zod');

const assetUrlSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), {
    message: 'Use uma URL absoluta ou caminho relativo público.'
  });

const optionalAssetSchema = z.union([assetUrlSchema, z.literal('')]).optional();

const orderSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.coerce.number().int().min(1).max(9999),
  customerName: z.string().min(2).max(200),
  email: z.email().max(254),
  phone: z.string().min(6).max(30),
  address: z.string().min(4).max(500),
  postalCode: z.string().min(4).max(20),
  city: z.string().min(2).max(100),
  paymentMethod: z.string().min(2).max(50),
  notes: z.string().max(1000).optional().default('')
});

const orderStatusSchema = z.enum(['pending', 'awaiting_payment', 'paid', 'failed']);

const productSchema = z.object({
  id: z.string().max(100),
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(200),
  shortDescription: z.string().min(2).max(500),
  description: z.string().min(2).max(10000),
  price: z.coerce.number().positive().max(999999),
  compareAtPrice: z.coerce.number().positive().max(999999).optional(),
  images: z.array(assetUrlSchema).min(1).max(20),
  videoUrl: optionalAssetSchema,
  benefits: z.array(z.string().min(1).max(500)).min(1).max(50),
  featured: z.boolean().optional(),
  badge: z.string().max(100).optional()
});

const newProductSchema = productSchema.omit({ id: true }).extend({
  id: z.string().optional()
});

const contentSchema = z.object({
  brand: z.object({
    name: z.string().min(1).max(200),
    tagline: z.string().max(300),
    headline: z.string().max(500),
    heroVideoUrl: optionalAssetSchema,
    heroPosterUrl: assetUrlSchema
  }),
  about: z.object({
    story: z.string().max(5000),
    mission: z.string().max(5000),
    values: z.array(z.string().min(1).max(500)).min(1).max(20)
  }),
  contact: z.object({
    email: z.email().max(254),
    phone: z.string().max(30),
    address: z.string().max(500),
    whatsapp: z.string().max(30)
  })
});

module.exports = {
  assetUrlSchema,
  optionalAssetSchema,
  orderSchema,
  orderStatusSchema,
  productSchema,
  newProductSchema,
  contentSchema
};
