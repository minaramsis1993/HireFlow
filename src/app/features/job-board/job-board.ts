import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '@core/auth/auth-service';
import { ApplicationView, Job, PIPELINE_STAGE_LABELS } from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { CandidateStore } from '@core/services/candidate-store';
import { JobStore } from '@core/services/job-store';
import { NotificationService } from '@core/services/notification-service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { pipelineStageTone } from '@shared/ui/status-chip/tone';
import { openApplyDialog } from './apply-dialog/apply-dialog';

/** Candidate-facing job board: browse open roles and apply to them. */
@Component({
  selector: 'app-job-board',
  imports: [
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './job-board.html',
  styleUrl: './job-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobBoard {
  private readonly auth = inject(AuthService);
  private readonly applicationStore = inject(ApplicationStore);
  private readonly candidateStore = inject(CandidateStore);
  private readonly dialog = inject(MatDialog);
  private readonly jobStore = inject(JobStore);
  private readonly notifications = inject(NotificationService);

  protected readonly search = signal('');
  protected readonly stageLabels = PIPELINE_STAGE_LABELS;
  protected readonly stageTone = pipelineStageTone;

  /** Only `open` requisitions accept applications, so only those are listed. */
  protected readonly jobs = computed<readonly Job[]>(() => {
    const needle = this.search().trim().toLowerCase();
    const open = [...this.jobStore.openJobs()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    return needle
      ? open.filter((job) =>
          `${job.title} ${job.department} ${job.location} ${job.requirements.join(' ')}`
            .toLowerCase()
            .includes(needle),
        )
      : open;
  });

  private readonly myApplications = computed<readonly ApplicationView[]>(() => {
    const profile = this.auth.candidateProfile();
    return profile ? this.applicationStore.forCandidate(profile.id) : [];
  });

  /** The candidate's existing application for a job, if they already applied. */
  protected applicationFor(jobId: string): ApplicationView | undefined {
    return this.myApplications().find((application) => application.jobId === jobId);
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected async apply(job: Job): Promise<void> {
    const profile = this.auth.candidateProfile();
    if (!profile) {
      this.notifications.error('Your candidate profile is still loading. Try again in a moment.');
      return;
    }

    const submission = await openApplyDialog(this.dialog, { job });
    if (!submission) {
      return;
    }

    this.applicationStore.apply({
      jobId: job.id,
      candidateId: profile.id,
      coverLetter: submission.coverLetter,
      resume: submission.resume,
    });

    // Keep the profile CV in step with the most recent upload.
    this.candidateStore.update(profile.id, { resume: submission.resume });

    this.notifications.success(`Application sent for ${job.title}.`);
  }
}
