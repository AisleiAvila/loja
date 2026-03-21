import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ContentStoreService } from './services/content-store.service';
import { SiteContent } from './types';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private readonly contentStore = inject(ContentStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly mobileMenuOpen = signal(false);
  protected readonly siteContent = signal<SiteContent | null>(null);

  ngOnInit(): void {
    this.contentStore.getContent().pipe(
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

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mobileMenuOpen()) {
      this.mobileMenuOpen.set(false);
    }
  }

  protected readonly isAdmin = computed(() => {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('admin-token');
  });

  protected readonly whatsappLink = computed(() => {
    const number = this.siteContent()?.contact.whatsapp?.replaceAll(/\D/g, '') ?? '';

    if (!number) {
      return '#';
    }

    return `https://wa.me/${number}?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20os%20produtos.`;
  });
}
