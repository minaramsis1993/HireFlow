import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import {
  ApplicationView,
  candidateFullName,
  candidateInitials,
  PIPELINE_STAGE_LABELS,
  PipelineStage,
} from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';
import { NotificationService } from '@core/services/notification-service';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { pipelineStageTone } from '@shared/ui/status-chip/tone';

interface Column {
  readonly stage: PipelineStage;
  readonly label: string;
  readonly tone: string;
  readonly applications: readonly ApplicationView[];
}

/** Kanban board: drag a candidate card between stages to advance them. */
@Component({
  selector: 'app-pipeline',
  imports: [
    CdkDrag,
    CdkDragPreview,
    CdkDropList,
    CdkDropListGroup,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    PageHeader,
    RouterLink,
  ],
  templateUrl: './pipeline.html',
  styleUrl: './pipeline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pipeline {
  private readonly applicationStore = inject(ApplicationStore);
  private readonly jobStore = inject(JobStore);
  private readonly notifications = inject(NotificationService);

  protected readonly jobFilter = signal<string>('all');
  protected readonly jobs = this.jobStore.jobs;

  protected readonly initials = candidateInitials;
  protected readonly fullName = candidateFullName;

  protected readonly columns = computed<readonly Column[]>(() => {
    const jobId = this.jobFilter();

    return this.applicationStore.byStage().map((bucket) => ({
      stage: bucket.stage,
      label: PIPELINE_STAGE_LABELS[bucket.stage],
      tone: pipelineStageTone(bucket.stage),
      applications:
        jobId === 'all'
          ? bucket.applications
          : bucket.applications.filter((application) => application.jobId === jobId),
    }));
  });

  protected readonly total = computed(() =>
    this.columns().reduce((sum, column) => sum + column.applications.length, 0),
  );

  /**
   * The board reads straight from the store, so a drop only needs to record the
   * new stage — the columns recompute from the resulting signal change.
   */
  protected onDrop(event: CdkDragDrop<PipelineStage>): void {
    const target = event.container.data;
    const application = event.item.data as ApplicationView;

    if (application.stage === target) {
      return;
    }

    this.applicationStore.moveToStage(application.id, target);
    this.notifications.success(
      `${this.fullName(application.candidate)} moved to ${PIPELINE_STAGE_LABELS[target]}.`,
    );
  }
}
