import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="not-found section-shell card">
      <span class="eyebrow">404</span>
      <h1>Página não encontrada</h1>
      <p>O endereço que procura não existe ou foi movido.</p>
      <a class="btn-secondary" routerLink="/">Voltar à home</a>
    </section>
  `,
  styles: `
    .not-found {
      display: grid;
      gap: 1rem;
      justify-items: start;
      margin: 3rem auto;
      padding: clamp(1.25rem, 3vw, 2rem);
    }
    .not-found h1 {
      font-size: var(--text-2xl);
    }
    .not-found p {
      color: var(--muted);
      max-width: 36ch;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundPageComponent {}
