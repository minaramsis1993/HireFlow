import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Standard page heading. Project action buttons into the right-hand slot:
 * `<app-page-header title="Jobs"><button actions mat-flat-button>New</button></app-page-header>`
 */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__text">
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  styleUrl: './page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
