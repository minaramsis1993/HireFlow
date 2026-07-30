import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { describeFileSize, ResumeFile } from '@core/models';

/**
 * Uploaded CV, shown wherever a résumé is attached.
 *
 * The link is opened imperatively: the prototype stores an object URL, which
 * Angular's sanitiser would strip from an `href`. A signed storage URL will
 * work either way.
 */
@Component({
  selector: 'app-resume-chip',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <span class="resume">
      <mat-icon class="resume__icon" aria-hidden="true">picture_as_pdf</mat-icon>
      <span class="resume__name" [title]="resume().name">{{ resume().name }}</span>
      <span class="resume__size">{{ size() }}</span>

      @if (resume().url) {
        <button matButton type="button" class="resume__action" (click)="open()">View</button>
      } @else {
        <span
          class="resume__unavailable"
          matTooltip="Uploaded before this session — the file itself lives in object storage once the API lands."
        >
          Not stored
        </span>
      }
    </span>
  `,
  styleUrl: './resume-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeChip {
  private readonly window = inject(DOCUMENT).defaultView;

  readonly resume = input.required<ResumeFile>();

  protected readonly size = computed(() => describeFileSize(this.resume().sizeBytes));

  protected open(): void {
    const url = this.resume().url;
    if (url) {
      this.window?.open(url, '_blank', 'noopener');
    }
  }
}
