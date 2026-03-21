import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Product, SiteContent } from '../types';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly products = signal<Product[]>([]);
  protected readonly content = signal<SiteContent | null>(null);

  ngOnInit(): void {
    this.apiService.getProducts().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((products) => {
      this.products.set(products.filter((product) => product.featured));
    });

    this.apiService.getContent().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((content) => {
      this.content.set(content);
    });
  }
}
