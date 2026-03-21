import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { ContentStoreService } from '../services/content-store.service';
import { SiteContent } from '../types';

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-content.component.html',
  styleUrl: './admin-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminContentComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly contentStore = inject(ContentStoreService);
  private readonly destroyRef = inject(DestroyRef);

  readonly token = input.required<string>();
  readonly unauthorized = output<void>();

  protected readonly editableContent = signal<SiteContent | null>(null);
  protected readonly feedback = signal('');

  ngOnInit(): void {
    this.contentStore.getContent().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (content) => this.editableContent.set(structuredClone(content)),
      error: (err) => {
        if (err.status === 401) this.unauthorized.emit();
      }
    });
  }

  protected saveContent(): void {
    const content = this.editableContent();

    if (!this.token() || !content) {
      return;
    }

    this.apiService.updateContent(content).subscribe({
      next: (updated) => {
        this.editableContent.set(structuredClone(updated));
        this.contentStore.invalidate();
        this.feedback.set('Conteúdo institucional atualizado.');
      },
      error: (error) => {
        if (error.status === 401) { this.unauthorized.emit(); return; }
        this.feedback.set('Não foi possível atualizar o conteúdo.');
      }
    });
  }
}
