import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import {
  ApplicationView,
  CANDIDATE_SOURCE_LABELS,
  candidateFullName,
  candidateInitials,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGES,
  PipelineStage,
} from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { CandidateStore } from '@core/services/candidate-store';
import { NotificationService } from '@core/services/notification-service';
import { TimeAgoPipe } from '@shared/pipes/time-ago-pipe';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { RatingStars } from '@shared/ui/rating-stars/rating-stars';
import { ResumeChip } from '@shared/ui/resume-chip/resume-chip';

@Component({
  selector: 'app-candidate-detail',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeader,
    RatingStars,
    ResumeChip,
    RouterLink,
    TimeAgoPipe,
  ],
  templateUrl: './candidate-detail.html',
  styleUrl: './candidate-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateDetail {
  private readonly candidateStore = inject(CandidateStore);
  private readonly applicationStore = inject(ApplicationStore);
  private readonly notifications = inject(NotificationService);

  readonly id = input.required<string>();

  protected readonly candidate = computed(() => this.candidateStore.byId(this.id()));
  protected readonly applications = computed(() => this.applicationStore.forCandidate(this.id()));

  protected readonly stages = PIPELINE_STAGES;
  protected readonly stageLabels = PIPELINE_STAGE_LABELS;
  protected readonly sourceLabels = CANDIDATE_SOURCE_LABELS;
  protected readonly initials = candidateInitials;
  protected readonly fullName = candidateFullName;

  /** Unsaved note edits, keyed by application id, so typing survives re-renders. */
  private readonly noteDrafts = signal<Readonly<Record<string, string>>>({});

  protected moveStage(applicationId: string, stage: PipelineStage): void {
    this.applicationStore.moveToStage(applicationId, stage);
    this.notifications.success(`Moved to ${PIPELINE_STAGE_LABELS[stage]}.`);
  }

  protected rate(applicationId: string, rating: number): void {
    this.applicationStore.rate(applicationId, rating);
    this.notifications.success(`Rated ${rating}/5.`);
  }

  protected noteValue(application: ApplicationView): string {
    return this.noteDrafts()[application.id] ?? application.notes;
  }

  protected noteChanged(application: ApplicationView): boolean {
    const draft = this.noteDrafts()[application.id];
    return draft !== undefined && draft !== application.notes;
  }

  protected onNoteInput(applicationId: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.noteDrafts.update((drafts) => ({ ...drafts, [applicationId]: value }));
  }

  protected saveNote(application: ApplicationView): void {
    const draft = this.noteDrafts()[application.id];
    if (draft === undefined) {
      return;
    }

    this.applicationStore.addNote(application.id, draft.trim());
    this.discardNote(application.id);
    this.notifications.success('Note saved.');
  }

  protected discardNote(applicationId: string): void {
    this.noteDrafts.update((drafts) => {
      const next = { ...drafts };
      delete next[applicationId];
      return next;
    });
  }
}
