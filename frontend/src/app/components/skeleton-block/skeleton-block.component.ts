import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-block',
  standalone: true,
  template: `
    <div class="skeleton-block" [style.aspect-ratio]="aspectRatio()" [style.height]="height()" [style.border-radius]="radius()"></div>
  `,
  styles: `
    :host { display: block; }
    .skeleton-block {
      width: 100%;
      background: rgba(31, 45, 42, 0.08);
      border-radius: 0.75rem;
      animation: skeleton-pulse 1.8s ease-in-out infinite;
    }
    @keyframes skeleton-pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonBlockComponent {
  readonly aspectRatio = input('');
  readonly height = input('');
  readonly radius = input('0.75rem');
}
