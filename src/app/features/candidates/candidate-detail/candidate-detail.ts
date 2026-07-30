import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import {
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

@Component({
  selector: 'app-candidate-detail',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    PageHeader,
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

  protected moveStage(applicationId: string, stage: PipelineStage): void {
    this.applicationStore.moveToStage(applicationId, stage);
    this.notifications.success(`Moved to ${PIPELINE_STAGE_LABELS[stage]}.`);
  }
}
