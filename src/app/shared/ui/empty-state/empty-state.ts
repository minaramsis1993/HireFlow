import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Placeholder shown when a list or board has nothing to display. */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon class="empty__icon" aria-hidden="true">{{ icon() }}</mat-icon>
      <p class="empty__heading">{{ heading() }}</p>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input<string>('');
  readonly icon = input<string>('inbox');
}
