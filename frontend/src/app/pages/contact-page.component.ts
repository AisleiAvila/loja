import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ContentStoreService } from '../services/content-store.service';
import { SiteContent } from '../types';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactPageComponent implements OnInit {
  private readonly contentStore = inject(ContentStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly content = signal<SiteContent | null>(null);
  protected readonly formName = signal('');
  protected readonly formEmail = signal('');
  protected readonly formMessage = signal('');
  protected readonly submitted = signal(false);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.contentStore.getContent().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (content) => {
        this.content.set(content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  protected send(): void {
    const page = this.content();

    if (!page) {
      return;
    }

    const subject = encodeURIComponent(`Pedido de contacto de ${this.formName()}`);
    const body = encodeURIComponent(`${this.formMessage()}\n\nEmail: ${this.formEmail()}`);

    if (this.isBrowser) globalThis.location.href = `mailto:${page.contact.email}?subject=${subject}&body=${body}`;
    this.submitted.set(true);
  }

  protected readonly whatsappLink = computed(() => {
    const page = this.content();

    if (!page?.contact.whatsapp) {
      return '#';
    }

    const number = page.contact.whatsapp.replaceAll(/\D/g, '');
    const text = encodeURIComponent('Olá, gostaria de esclarecer algumas dúvidas sobre os produtos.');

    return `https://wa.me/${number}?text=${text}`;
  });
}
