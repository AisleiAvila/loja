import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { Product } from '../types';
import { AdminProductFormComponent } from './admin-product-form.component';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [FormsModule, AdminProductFormComponent],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProductsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productPageSize = 6;

  readonly token = input.required<string>();
  readonly unauthorized = output<void>();

  protected readonly products = signal<Product[]>([]);
  protected readonly selectedProductId = signal('');
  protected readonly feedback = signal('');
  protected readonly editableProduct = signal<Product | null>(null);
  protected readonly isCreatingProduct = signal(false);
  protected readonly previousSelectedProductId = signal('');
  protected readonly validationErrors = signal<Record<string, string>>({});
  protected readonly productSearch = signal('');
  protected readonly currentProductPage = signal(1);

  protected readonly selectedProduct = computed(() =>
    this.products().find((product) => product.id === this.selectedProductId()) ?? null
  );

  protected readonly filteredProducts = computed(() => {
    const searchTerm = this.normalizeSearch(this.productSearch());

    if (!searchTerm) {
      return this.products();
    }

    return this.products().filter((product) => {
      const searchableValue = this.normalizeSearch([
        product.name,
        product.slug,
        product.shortDescription,
        product.badge || ''
      ].join(' '));

      return searchableValue.includes(searchTerm);
    });
  });

  protected readonly totalProductPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / this.productPageSize))
  );

  protected readonly paginatedProducts = computed(() => {
    const currentPage = Math.min(this.currentProductPage(), this.totalProductPages());
    const start = (currentPage - 1) * this.productPageSize;
    return this.filteredProducts().slice(start, start + this.productPageSize);
  });

  ngOnInit(): void {
    this.apiService.getProducts().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (products) => {
        this.products.set(this.sortProducts(products));
        this.syncProductPagination();
        this.selectProduct(products[0]?.id ?? '');
      },
      error: (err) => {
        if (err.status === 401) this.unauthorized.emit();
      }
    });
  }

  protected onProductChange(product: Product): void {
    this.editableProduct.set(product);
  }

  protected onFieldEdited(field: string): void {
    this.clearValidationError(field);
  }

  protected saveProduct(): void {
    const token = this.token();
    const product = this.editableProduct();

    if (!token || !product) {
      return;
    }

    const validationErrors = this.validateProduct(product);

    if (Object.keys(validationErrors).length > 0) {
      this.validationErrors.set(validationErrors);
      this.feedback.set('Corrija os campos assinalados antes de guardar.');
      return;
    }

    const request = this.isCreatingProduct()
      ? this.apiService.createProduct(product)
      : this.apiService.updateProduct(product.id, product);
    request.subscribe({
      next: (savedProduct) => {
        if (this.isCreatingProduct()) {
          this.products.set(this.sortProducts([...this.products(), savedProduct]));
          this.feedback.set('Produto criado com sucesso.');
        } else {
          this.products.set(this.products().map((item) => (item.id === savedProduct.id ? savedProduct : item)));
          this.feedback.set('Produto atualizado com sucesso.');
        }

        this.validationErrors.set({});
        this.syncProductPagination();
        this.selectProduct(savedProduct.id);
      },
      error: (error) => {
        if (error.status === 401) { this.unauthorized.emit(); return; }
        this.feedback.set(error.error?.message || 'Não foi possível guardar o produto.');
      }
    });
  }

  protected deleteSelectedProduct(): void {
    const token = this.token();
    const product = this.editableProduct();

    if (!token || !product || this.isCreatingProduct()) {
      return;
    }

    if (typeof globalThis.confirm === 'function' && !globalThis.confirm(`Apagar o produto "${product.name}"?`)) {
      return;
    }

    this.apiService.deleteProduct(product.id).subscribe({
      next: () => {
        const remainingProducts = this.products().filter((item) => item.id !== product.id);
        this.products.set(remainingProducts);
        this.feedback.set('Produto apagado com sucesso.');
        this.validationErrors.set({});
        this.syncProductPagination();
        this.selectProduct(remainingProducts[0]?.id ?? '');
      },
      error: (error) => {
        if (error.status === 401) { this.unauthorized.emit(); return; }
        this.feedback.set(error.error?.message || 'Não foi possível apagar o produto.');
      }
    });
  }

  protected startNewProduct(): void {
    this.feedback.set('');
    this.validationErrors.set({});
    this.previousSelectedProductId.set(this.selectedProductId());
    this.isCreatingProduct.set(true);
    this.selectedProductId.set('');
    this.editableProduct.set({
      id: '',
      slug: '',
      name: '',
      shortDescription: '',
      description: '',
      price: 0,
      compareAtPrice: undefined,
      images: ['/brand/products/novo-produto.svg'],
      videoUrl: '',
      benefits: [''],
      featured: false,
      badge: ''
    });
  }

  protected cancelProductChanges(): void {
    this.feedback.set('');
    this.validationErrors.set({});

    if (this.isCreatingProduct()) {
      this.selectProduct(this.previousSelectedProductId() || this.products()[0]?.id || '');
      return;
    }

    this.selectProduct(this.selectedProductId());
  }

  protected selectExistingProduct(productId: string): void {
    this.feedback.set('');
    this.validationErrors.set({});
    this.selectProduct(productId);
  }

  protected setProductSearchTerm(value: string): void {
    this.productSearch.set(value);
    this.currentProductPage.set(1);
  }

  protected goToProductPage(direction: 'previous' | 'next'): void {
    const currentPage = this.currentProductPage();
    const nextPage = direction === 'previous' ? currentPage - 1 : currentPage + 1;
    this.currentProductPage.set(Math.min(Math.max(nextPage, 1), this.totalProductPages()));
  }

  private selectProduct(productId: string): void {
    this.selectedProductId.set(productId);
    this.isCreatingProduct.set(false);

    const product = this.products().find((item) => item.id === productId) ?? null;
    this.editableProduct.set(product ? this.cloneProduct(product) : null);
  }

  private clearValidationError(field: string): void {
    const errors = this.validationErrors();

    if (!errors[field]) {
      return;
    }

    const { [field]: _removed, ...remainingErrors } = errors;
    this.validationErrors.set(remainingErrors);
  }

  private validateProduct(product: Product): Record<string, string> {
    const errors: Record<string, string> = {};
    const normalizedImages = product.images.map((value) => value.trim()).filter(Boolean);
    const normalizedBenefits = product.benefits.map((value) => value.trim()).filter(Boolean);

    if (product.name.trim().length < 2) errors['name'] = 'Informe um nome com pelo menos 2 caracteres.';
    if (product.slug.trim().length < 2) errors['slug'] = 'Informe um slug com pelo menos 2 caracteres.';
    if (product.shortDescription.trim().length < 2) errors['shortDescription'] = 'Informe uma descrição curta válida.';
    if (product.description.trim().length < 2) errors['description'] = 'Informe uma descrição completa válida.';
    if (Number(product.price) <= 0) errors['price'] = 'Informe um preço maior do que zero.';
    if (product.compareAtPrice !== undefined && Number(product.compareAtPrice) <= 0) {
      errors['compareAtPrice'] = 'O preço anterior deve ser maior do que zero.';
    }
    if (product.videoUrl && !this.isPublicAssetUrl(product.videoUrl)) {
      errors['videoUrl'] = 'Use uma URL absoluta ou um caminho público iniciado por /.';
    }
    if (normalizedImages.length === 0) {
      errors['images'] = 'Adicione pelo menos uma imagem.';
    } else if (normalizedImages.some((value) => !this.isPublicAssetUrl(value))) {
      errors['images'] = 'As imagens devem usar URL absoluta ou caminho público iniciado por /.';
    }
    if (normalizedBenefits.length === 0) errors['benefits'] = 'Adicione pelo menos um benefício.';

    return errors;
  }

  private isPublicAssetUrl(value: string): boolean {
    return value.startsWith('/') || /^https?:\/\//.test(value);
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private sortProducts(products: Product[]): Product[] {
    return [...products].sort((left, right) => left.name.localeCompare(right.name));
  }

  private syncProductPagination(): void {
    const totalPages = Math.max(1, Math.ceil(this.filteredProducts().length / this.productPageSize));
    this.currentProductPage.set(Math.min(this.currentProductPage(), totalPages));
  }

  private cloneProduct(product: Product): Product {
    return {
      ...product,
      images: [...product.images],
      benefits: [...product.benefits]
    };
  }
}
