import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
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

  readonly token = input.required<string>();
  readonly unauthorized = output<void>();

  protected readonly orders = signal<Order[]>([]);

  ngOnInit(): void {
    this.apiService.getOrders().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (orders) => this.orders.set(orders),
      error: (err) => {
        if (err.status === 401) this.unauthorized.emit();
      }
    });
  }
}
