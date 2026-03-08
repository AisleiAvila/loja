import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Product, SiteContent } from '../types';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly products = signal<Product[]>([]);
  protected readonly content = signal<SiteContent | null>(null);

  ngOnInit(): void {
    this.apiService.getProducts().subscribe((products) => {
      this.products.set(products.filter((product) => product.featured));
    });

    this.apiService.getContent().subscribe((content) => {
      this.content.set(content);
    });
  }
}
