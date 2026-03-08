import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { Order, Product, SiteContent } from '../types';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss'
})
export class AdminPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly token = signal(localStorage.getItem('admin-token') ?? '');
  protected readonly password = signal('');
  protected readonly products = signal<Product[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly content = signal<SiteContent | null>(null);
  protected readonly selectedProductId = signal('');
  protected readonly feedback = signal('');

  protected readonly selectedProduct = computed(() =>
    this.products().find((product) => product.id === this.selectedProductId()) ?? null
  );

  ngOnInit(): void {
    if (this.token()) {
      this.loadAdminData();
    }
  }

  protected login(): void {
    this.feedback.set('');

    this.apiService.adminLogin(this.password()).subscribe({
      next: ({ token }) => {
        this.token.set(token);
        localStorage.setItem('admin-token', token);
        this.loadAdminData();
      },
      error: () => this.feedback.set('Credenciais inválidas.')
    });
  }

  protected saveProduct(): void {
    const token = this.token();
    const product = this.selectedProduct();

    if (!token || !product) {
      return;
    }

    this.apiService.updateProduct(token, product.id, product).subscribe({
      next: (updated) => {
        this.products.set(this.products().map((item) => (item.id === updated.id ? updated : item)));
        this.feedback.set('Produto atualizado com sucesso.');
      },
      error: () => this.feedback.set('Não foi possível atualizar o produto.')
    });
  }

  protected saveContent(): void {
    const token = this.token();
    const content = this.content();

    if (!token || !content) {
      return;
    }

    this.apiService.updateContent(token, content).subscribe({
      next: (updated) => {
        this.content.set(updated);
        this.feedback.set('Conteúdo institucional atualizado.');
      },
      error: () => this.feedback.set('Não foi possível atualizar o conteúdo.')
    });
  }

  protected updateProductList(field: 'benefits' | 'images', value: string): void {
    const product = this.selectedProduct();

    if (!product) {
      return;
    }

    product[field] = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private loadAdminData(): void {
    const token = this.token();

    if (!token) {
      return;
    }

    this.apiService.getProducts().subscribe((products) => {
      this.products.set(products);
      this.selectedProductId.set(products[0]?.id ?? '');
    });

    this.apiService.getContent().subscribe((content) => this.content.set(content));
    this.apiService.getOrders(token).subscribe((orders) => this.orders.set(orders));
  }
}
