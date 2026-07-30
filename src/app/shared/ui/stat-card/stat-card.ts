import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Single headline metric for the dashboard. */
@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule],
  template: `
    <div class="stat">
      <div class="stat__icon" aria-hidden="true">
        <mat-icon>{{ icon() }}</mat-icon>
      </div>
      <div>
        <p class="stat__value">{{ value() }}</p>
        <p class="stat__label">{{ label() }}</p>
      </div>
    </div>
  `,
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('insights');
}
