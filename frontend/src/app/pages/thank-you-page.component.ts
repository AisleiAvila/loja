import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
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
          localStorage.setItem('last-order', JSON.stringify(order));
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
    const navigationOrder = history.state?.order as Order | undefined;

    if (navigationOrder) {
      this.order.set(navigationOrder);
      this.loading.set(false);
      return;
    }

    const persistedOrder = localStorage.getItem('last-order');

    if (persistedOrder) {
      this.order.set(JSON.parse(persistedOrder) as Order);
    }

    this.loading.set(false);
  }
}
