import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
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
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly content = signal<SiteContent | null>(null);
  protected readonly form = {
    name: '',
    email: '',
    message: ''
  };
  protected readonly submitted = signal(false);

  ngOnInit(): void {
    this.apiService.getContent().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((content) => this.content.set(content));
  }

  protected send(): void {
    const page = this.content();

    if (!page) {
      return;
    }

    const subject = encodeURIComponent(`Pedido de contacto de ${this.form.name}`);
    const body = encodeURIComponent(`${this.form.message}\n\nEmail: ${this.form.email}`);

    globalThis.location.href = `mailto:${page.contact.email}?subject=${subject}&body=${body}`;
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
