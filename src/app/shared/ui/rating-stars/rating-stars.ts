import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { RATING_VALUES } from '@core/models';

/**
 * 1-5 scorecard control. Read-only by default; set `editable` to let a
 * recruiter score, and listen to `rated` — this component owns no state.
 */
@Component({
  selector: 'app-rating-stars',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (editable()) {
      <div class="stars" role="group" [attr.aria-label]="label()">
        @for (star of values; track star) {
          <button
            matIconButton
            type="button"
            class="stars__button"
            [attr.aria-label]="'Rate ' + star + ' of 5'"
            [attr.aria-pressed]="star === value()"
            (click)="rated.emit(star)"
          >
            <mat-icon [class.stars__icon--on]="star <= filled()">
              {{ star <= filled() ? 'star' : 'star_border' }}
            </mat-icon>
          </button>
        }
      </div>
    } @else {
      <span class="stars" [attr.aria-label]="ariaLabel()">
        @for (star of values; track star) {
          <mat-icon aria-hidden="true" [class.stars__icon--on]="star <= filled()">
            {{ star <= filled() ? 'star' : 'star_border' }}
          </mat-icon>
        }
      </span>
    }
  `,
  styleUrl: './rating-stars.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingStars {
  readonly value = input<number | null>(null);
  /** Bare `editable` attribute is enough to switch the control on. */
  readonly editable = input(false, { transform: booleanAttribute });
  readonly label = input('Rating');

  readonly rated = output<number>();

  protected readonly values = RATING_VALUES;

  protected readonly filled = computed(() => this.value() ?? 0);

  protected readonly ariaLabel = computed(() => {
    const value = this.value();
    return value === null ? `${this.label()}: not rated` : `${this.label()}: ${value} of 5`;
  });
}
