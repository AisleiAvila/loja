import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Product } from '../types';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.scss'
})
export class ProductPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  protected readonly product = signal<Product | null>(null);
  protected readonly selectedImage = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');

      if (!slug) {
        return;
      }

      this.apiService.getProductBySlug(slug).subscribe((product) => {
        this.product.set(product);
        this.selectedImage.set(product.images[0] ?? '');
      });
    });
  }

  protected selectImage(image: string): void {
    this.selectedImage.set(image);
  }

  protected buyNow(): void {
    const product = this.product();

    if (!product) {
      return;
    }

    this.router.navigate(['/checkout'], {
      queryParams: { product: product.id }
    });
  }
}
