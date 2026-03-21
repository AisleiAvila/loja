import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { AdminContentComponent } from './admin-content.component';
import { AdminOrdersComponent } from './admin-orders.component';
import { AdminProductsComponent } from './admin-products.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [FormsModule, AdminProductsComponent, AdminOrdersComponent, AdminContentComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPageComponent {
  private readonly apiService = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly token = signal(this.isBrowser ? localStorage.getItem('admin-token') ?? '' : '');
  protected readonly password = signal('');
  protected readonly feedback = signal('');

  protected login(): void {
    this.feedback.set('');

    this.apiService.adminLogin(this.password()).subscribe({
      next: ({ token }) => {
        this.token.set(token);
        if (this.isBrowser) localStorage.setItem('admin-token', token);
      },
      error: () => this.feedback.set('Credenciais inválidas.')
    });
  }

  protected onUnauthorized(): void {
    if (this.isBrowser) localStorage.removeItem('admin-token');
    this.token.set('');
    this.feedback.set('Sessão expirada. Faça login novamente.');
  }
}
