import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-admin-image-gallery',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-image-gallery.component.html',
  styleUrl: './admin-image-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminImageGalleryComponent {
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly images = input.required<string[]>();
  readonly productName = input('');
  readonly token = input.required<string>();
  readonly validationError = input('');

  readonly imagesChange = output<string[]>();
  readonly unauthorized = output<void>();

  protected readonly isUploading = signal(false);
  protected readonly feedback = signal('');

  protected uploadImage(event: Event): void {
    const token = this.token();
    const inputElement = event.target as HTMLInputElement | null;
    const file = inputElement?.files?.[0];

    if (!token || !file) {
      return;
    }

    this.isUploading.set(true);
    this.feedback.set('');

    this.apiService.uploadProductImage(token, file).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ url }) => {
        const nextImages = this.images().filter((image) => image !== '/brand/products/novo-produto.svg');
        this.imagesChange.emit([...nextImages, url]);
        this.feedback.set('Imagem enviada com sucesso.');

        if (inputElement) {
          inputElement.value = '';
        }
      },
      error: (error) => {
        if (error.status === 401) { this.unauthorized.emit(); return; }
        this.feedback.set(error.error?.message || 'Não foi possível enviar a imagem.');
      },
      complete: () => this.isUploading.set(false)
    });
  }

  protected removeImage(imageToRemove: string): void {
    const token = this.token();

    const finalizeRemoval = () => {
      const nextImages = this.images().filter((image) => image !== imageToRemove);
      this.imagesChange.emit(nextImages);
      this.feedback.set(nextImages.length ? 'Imagem removida da galeria.' : 'A galeria ficou vazia. Adicione uma nova imagem.');
    };

    if (!this.isManagedUploadAsset(imageToRemove) || !token) {
      finalizeRemoval();
      return;
    }

    this.isUploading.set(true);
    this.feedback.set('');

    this.apiService.deleteUploadedAsset(token, imageToRemove).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => finalizeRemoval(),
      error: (error) => {
        if (error.status === 401) { this.unauthorized.emit(); return; }
        this.feedback.set(error.error?.message || 'Não foi possível remover a imagem do storage.');
      },
      complete: () => this.isUploading.set(false)
    });
  }

  protected clearFeedback(): void {
    this.feedback.set('');
  }

  protected updateImagesFromText(value: string): void {
    const images = value.split('\n').map((item) => item.trim()).filter(Boolean);
    this.imagesChange.emit(images);
  }

  private isManagedUploadAsset(value: string): boolean {
    if (value.startsWith('/uploads/') || value.startsWith('/api/assets/blob/')) {
      return true;
    }

    if (!/^https?:\/\//.test(value)) {
      return false;
    }

    try {
      const parsedUrl = new URL(value);

      if (parsedUrl.pathname.startsWith('/api/assets/blob/')) {
        return true;
      }

      return parsedUrl.hostname.includes('blob.vercel-storage.com') || parsedUrl.hostname.includes('supabase.co');
    } catch {
      return false;
    }
  }
}
