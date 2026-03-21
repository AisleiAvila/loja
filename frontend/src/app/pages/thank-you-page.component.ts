import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Order } from '../types';

@Component({
  selector: 'app-thank-you-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './thank-you-page.component.html',
  styleUrl: './thank-you-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThankYouPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');

    if (orderId) {
      this.apiService.getOrderSummary(orderId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (order) => {
          this.order.set(order);
          if (this.isBrowser) localStorage.setItem('last-order', JSON.stringify(order));
          this.loading.set(false);
        },
        error: () => {
          this.loadLocalOrder();
        }
      });

      return;
    }

    this.loadLocalOrder();
  }

  private loadLocalOrder(): void {
    const navigationOrder = this.parseOrder(history.state?.order);

    if (navigationOrder) {
      this.order.set(navigationOrder);
      this.loading.set(false);
      return;
    }

    const persistedOrder = this.isBrowser ? localStorage.getItem('last-order') : null;

    if (persistedOrder) {
      const parsed = this.parseOrder(this.safeJsonParse(persistedOrder));
      if (parsed) {
        this.order.set(parsed);
      } else if (this.isBrowser) {
        localStorage.removeItem('last-order');
      }
    }

    this.loading.set(false);
  }

  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private parseOrder(data: unknown): Order | null {
    if (
      typeof data === 'object' && data !== null &&
      'id' in data && typeof (data as Record<string, unknown>)['id'] === 'string' &&
      'productName' in data && typeof (data as Record<string, unknown>)['productName'] === 'string' &&
      'total' in data && typeof (data as Record<string, unknown>)['total'] === 'number'
    ) {
      return data as Order;
    }
    return null;
  }

  private static readonly statusLabels: Record<string, string> = {
    pending: 'Pendente',
    awaiting_payment: 'A aguardar pagamento',
    paid: 'Pago',
    failed: 'Falhado'
  };

  protected statusLabel(status: string): string {
    return ThankYouPageComponent.statusLabels[status] ?? status;
  }
}
