import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `
    <div class="skeleton-card card">
      <div class="skeleton-image skeleton"></div>
      @if (showTextLines()) {
        <div class="skeleton-body">
          <div class="skeleton-text medium"></div>
          <div class="skeleton-text small"></div>
        </div>
      }
    </div>
  `,
  styles: `
    .skeleton-card { overflow: hidden; }
    .skeleton-image { aspect-ratio: 4 / 5; }
    .skeleton-body { padding: 1.2rem; display: grid; gap: 0.85rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonCardComponent {
  readonly showTextLines = input(true);
}
