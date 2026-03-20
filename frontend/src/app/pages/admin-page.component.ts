import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { AdminContentComponent } from './admin-content.component';
import { AdminOrdersComponent } from './admin-orders.component';
import { AdminProductsComponent } from './admin-products.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminProductsComponent, AdminOrdersComponent, AdminContentComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss'
})
export class AdminPageComponent {
  private readonly apiService = inject(ApiService);

  protected readonly token = signal(localStorage.getItem('admin-token') ?? '');
  protected readonly password = signal('');
  protected readonly feedback = signal('');

  protected login(): void {
    this.feedback.set('');

    this.apiService.adminLogin(this.password()).subscribe({
      next: ({ token }) => {
        this.token.set(token);
        localStorage.setItem('admin-token', token);
      },
      error: () => this.feedback.set('Credenciais inválidas.')
    });
  }

  protected onUnauthorized(): void {
    localStorage.removeItem('admin-token');
    this.token.set('');
    this.feedback.set('Sessão expirada. Faça login novamente.');
  }
}
