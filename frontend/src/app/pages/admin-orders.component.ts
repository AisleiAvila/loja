import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService } from '../services/api.service';
import { Order } from '../types';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrdersComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 20;

  readonly token = input.required<string>();
  readonly unauthorized = output<void>();

  protected readonly orders = signal<Order[]>([]);
  protected readonly currentPage = signal(1);
  protected readonly totalOrders = signal(0);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalOrders() / this.pageSize))
  );

  ngOnInit(): void {
    this.fetchOrders(1);
  }

  protected goToPage(direction: 'previous' | 'next'): void {
    const page = direction === 'previous' ? this.currentPage() - 1 : this.currentPage() + 1;
    this.fetchOrders(Math.min(Math.max(page, 1), this.totalPages()));
  }

  private fetchOrders(page: number): void {
    this.apiService.getOrders(page, this.pageSize).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.orders.set(result.data);
        this.totalOrders.set(result.total);
        this.currentPage.set(result.page);
      },
      error: (err) => {
        if (err.status === 401) this.unauthorized.emit();
      }
    });
  }
}
