import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Tone } from './tone';

/** Compact, colour-coded label for a job status or pipeline stage. */
@Component({
  selector: 'app-status-chip',
  template: '<span class="chip" [class]="\'chip--\' + tone()">{{ label() }}</span>',
  styleUrl: './status-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
}
