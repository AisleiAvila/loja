import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ApiService } from './services/api.service';
import { SiteContent } from './types';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly siteContent = signal<SiteContent | null>(null);

  ngOnInit(): void {
    this.apiService.getContent().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (content) => this.siteContent.set(content),
      error: () => this.siteContent.set(null)
    });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected readonly whatsappLink = computed(() => {
    const number = this.siteContent()?.contact.whatsapp?.replaceAll(/\D/g, '') ?? '';

    if (!number) {
      return '#';
    }

    return `https://wa.me/${number}?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20os%20produtos.`;
  });
}
