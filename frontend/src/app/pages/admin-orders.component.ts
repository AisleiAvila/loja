import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { ApiService } from '../services/api.service';
import { Order } from '../types';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss'
})
export class AdminOrdersComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  readonly token = input.required<string>();
  readonly unauthorized = output<void>();

  protected readonly orders = signal<Order[]>([]);

  ngOnInit(): void {
    this.apiService.getOrders(this.token()).subscribe({
      next: (orders) => this.orders.set(orders),
      error: (err) => {
        if (err.status === 401) this.unauthorized.emit();
      }
    });
  }
}
