import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AdminLoginResponse, CreateOrderResponse, Order, OrderFormValue, PaginatedResponse, Product, SiteContent, UploadAssetResponse } from '../types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  getProductBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${slug}`);
  }

  getContent(): Observable<SiteContent> {
    return this.http.get<SiteContent>(`${this.baseUrl}/content`);
  }

  createOrder(payload: OrderFormValue): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.baseUrl}/orders`, payload);
  }

  getOrderSummary(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${orderId}/summary`);
  }

  adminLogin(password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.baseUrl}/admin/login`, { password });
  }

  getOrders(page = 1, limit = 20): Observable<PaginatedResponse<Order>> {
    return this.http.get<PaginatedResponse<Order>>(`${this.baseUrl}/orders`, {
      params: { page: String(page), limit: String(limit) }
    });
  }

  createProduct(payload: Omit<Product, 'id'> & { id?: string }): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, payload);
  }

  uploadProductImage(file: File): Observable<UploadAssetResponse> {
    const payload = new FormData();
    payload.append('image', file);

    return this.http.post<UploadAssetResponse>(`${this.baseUrl}/uploads/image`, payload);
  }

  deleteUploadedAsset(url: string): Observable<void> {
    return this.http.request<void>('delete', `${this.baseUrl}/uploads/image`, {
      body: { url }
    });
  }

  deleteProduct(productId: string): Observable<Product> {
    return this.http.delete<Product>(`${this.baseUrl}/products/${productId}`);
  }

  updateProduct(productId: string, payload: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/products/${productId}`, payload);
  }

  updateContent(payload: SiteContent): Observable<SiteContent> {
    return this.http.put<SiteContent>(`${this.baseUrl}/content`, payload);
  }
}
