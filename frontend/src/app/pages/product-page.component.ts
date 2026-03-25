import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, switchMap } from 'rxjs';

import { ApiService } from '../services/api.service';
import { Product } from '../types';
import { SkeletonBlockComponent } from '../components/skeleton-block/skeleton-block.component';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, SkeletonBlockComponent],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly product = signal<Product | null>(null);
  protected readonly selectedImage = signal('');
  protected readonly loadError = signal('');
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug');
        return slug ? this.apiService.getProductBySlug(slug) : EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (product) => {
        this.product.set(product);
        this.selectedImage.set(product.images[0] ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Não foi possível carregar o produto.');
        this.loading.set(false);
      }
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
