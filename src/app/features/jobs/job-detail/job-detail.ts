import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';

import {
  candidateFullName,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  JobStatus,
  PIPELINE_STAGE_LABELS,
} from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';
import { NotificationService } from '@core/services/notification-service';
import { TimeAgoPipe } from '@shared/pipes/time-ago-pipe';
import { confirmAction } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { jobStatusTone, pipelineStageTone } from '@shared/ui/status-chip/tone';

@Component({
  selector: 'app-job-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    PageHeader,
    RouterLink,
    StatusChip,
    TimeAgoPipe,
  ],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetail {
  private readonly jobStore = inject(JobStore);
  private readonly applicationStore = inject(ApplicationStore);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Bound from the `:id` route parameter by `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  protected readonly job = computed(() => this.jobStore.byId(this.id()));
  protected readonly applicants = computed(() => this.applicationStore.forJob(this.id()));

  protected readonly statuses = JOB_STATUSES;
  protected readonly statusLabels = JOB_STATUS_LABELS;
  protected readonly statusTone = jobStatusTone;
  protected readonly stageLabels = PIPELINE_STAGE_LABELS;
  protected readonly stageTone = pipelineStageTone;
  protected readonly fullName = candidateFullName;

  protected changeStatus(status: JobStatus): void {
    this.jobStore.changeStatus(this.id(), status);
    this.notifications.success(`Status updated to ${JOB_STATUS_LABELS[status]}.`);
  }

  protected async deleteJob(): Promise<void> {
    const job = this.job();
    if (!job) {
      return;
    }

    const confirmed = await confirmAction(this.dialog, {
      title: 'Delete this job?',
      message: `“${job.title}” and its ${this.applicants().length} application(s) will be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    for (const application of this.applicants()) {
      this.applicationStore.remove(application.id);
    }
    this.jobStore.remove(job.id);
    this.notifications.success('Job deleted.');
    void this.router.navigate(['/jobs']);
  }
}
