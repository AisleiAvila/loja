const { z } = require('zod');

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

module.exports = {
  assetUrlSchema,
  optionalAssetSchema,
  orderSchema,
  orderStatusSchema,
  productSchema,
  newProductSchema,
  contentSchema
};
