import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService } from '../services/api.service';
import { SiteContent } from '../types';

@Component({
  selector: 'app-about-page',
  standalone: true,
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly content = signal<SiteContent | null>(null);
  protected readonly loadError = signal('');

  ngOnInit(): void {
    this.apiService.getContent().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (content) => this.content.set(content),
      error: () => this.loadError.set('Não foi possível carregar o conteúdo.')
    });
  }
}
