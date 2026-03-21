import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Product } from '../types';
import { AdminImageGalleryComponent } from './admin-image-gallery.component';

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [FormsModule, AdminImageGalleryComponent],
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProductFormComponent {
  readonly product = input.required<Product>();
  readonly isCreating = input(false);
  readonly validationErrors = input<Record<string, string>>({});
  readonly token = input.required<string>();

  readonly productChange = output<Product>();
  readonly fieldEdited = output<string>();
  readonly unauthorized = output<void>();

  protected updateProductName(value: string): void {
    const product = this.product();
    const currentGeneratedSlug = this.slugify(product.name);
    const shouldSyncSlug = this.isCreating() && (!product.slug || product.slug === currentGeneratedSlug);

    this.productChange.emit({
      ...product,
      name: value,
      slug: shouldSyncSlug ? this.slugify(value) : product.slug
    });

    this.fieldEdited.emit('name');

    if (shouldSyncSlug) {
      this.fieldEdited.emit('slug');
    }
  }

  protected updateProductField<K extends keyof Product>(field: K, value: Product[K]): void {
    this.productChange.emit({ ...this.product(), [field]: value });
    this.fieldEdited.emit(String(field));
  }

  protected updateOptionalNumberField(field: 'compareAtPrice', value: number | string | null): void {
    if (value === null || value === '' || Number.isNaN(Number(value))) {
      this.updateProductField(field, undefined);
      return;
    }

    this.updateProductField(field, Number(value));
  }

  protected updateProductList(field: 'benefits', value: string): void {
    this.updateProductField(
      field,
      value.split('\n').map((item) => item.trim()).filter(Boolean)
    );
  }

  protected onImagesChange(images: string[]): void {
    this.updateProductField('images', images);
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/(^-|-$)/g, '');
  }
}
