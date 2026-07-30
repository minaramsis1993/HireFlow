import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThemeService } from '@core/services/theme-service';

/** Centred card shared by the sign-in and registration pages. */
@Component({
  selector: 'app-auth-card',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="auth">
      <button
        matIconButton
        type="button"
        class="auth__theme"
        [attr.aria-label]="
          theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
        "
        matTooltip="Toggle theme"
        (click)="theme.toggle()"
      >
        <mat-icon>{{ theme.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>

      <section class="auth__card">
        <p class="auth__brand">
          <mat-icon class="auth__brand-icon" aria-hidden="true">hub</mat-icon>
          <span>Hire<strong>Flow</strong></span>
        </p>

        <h1 class="auth__title">{{ title() }}</h1>
        <p class="auth__subtitle">{{ subtitle() }}</p>

        <ng-content />
      </section>

      <p class="auth__footer">
        <ng-content select="[footer]" />
      </p>
    </div>
  `,
  styleUrl: './auth-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCard {
  protected readonly theme = inject(ThemeService);

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
