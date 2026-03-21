export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  videoUrl?: string;
  benefits: string[];
  featured?: boolean;
  badge?: string;
}

export interface BrandContent {
  name: string;
  tagline: string;
  headline: string;
  heroVideoUrl: string;
  heroPosterUrl: string;
}

export interface AboutContent {
  story: string;
  mission: string;
  values: string[];
}

export interface ContactContent {
  email: string;
  phone: string;
  address: string;
  whatsapp: string;
}

export interface SiteContent {
  brand: BrandContent;
  about: AboutContent;
  contact: ContactContent;
}

export interface OrderFormValue {
  productId: string;
  quantity: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  paymentMethod: string;
  notes?: string;
}

export interface Order extends OrderFormValue {
  id: string;
  productName: string;
  total: number;
  status: 'pending' | 'awaiting_payment' | 'paid' | 'failed';
  createdAt: string;
  paymentProvider?: 'manual' | 'stripe';
  paymentReference?: string;
  paymentUrl?: string;
}

export interface AdminLoginResponse {
  token: string;
}

export interface UploadAssetResponse {
  url: string;
}

export interface CreateOrderResponse {
  order: Order;
  redirectUrl: string;
  paymentProvider: 'manual' | 'stripe';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
