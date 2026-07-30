import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { Job, JOB_STATUS_LABELS, JOB_STATUSES, JobStatus } from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { jobStatusTone } from '@shared/ui/status-chip/tone';

type StatusFilter = JobStatus | 'all';

@Component({
  selector: 'app-job-list',
  imports: [
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    PageHeader,
    RouterLink,
    StatusChip,
  ],
  templateUrl: './job-list.html',
  styleUrl: './job-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobList {
  private readonly jobStore = inject(JobStore);
  private readonly applicationStore = inject(ApplicationStore);

  protected readonly statuses = JOB_STATUSES;
  protected readonly statusLabels = JOB_STATUS_LABELS;
  protected readonly statusTone = jobStatusTone;

  /** `mat-table` row context is untyped, so the template goes through helpers. */
  protected statusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status];
  }

  protected readonly columns = ['title', 'department', 'status', 'openings', 'applicants'] as const;

  protected readonly search = signal('');
  protected readonly status = signal<StatusFilter>('all');
  protected readonly department = signal<string>('all');

  protected readonly departments = this.jobStore.departments;

  protected readonly filteredJobs = computed<readonly Job[]>(() => {
    const needle = this.search().trim().toLowerCase();
    const status = this.status();
    const department = this.department();

    return [...this.jobStore.jobs()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((job) => (status === 'all' ? true : job.status === status))
      .filter((job) => (department === 'all' ? true : job.department === department))
      .filter((job) =>
        needle
          ? `${job.title} ${job.location} ${job.hiringManager}`.toLowerCase().includes(needle)
          : true,
      );
  });

  protected readonly hasFilters = computed(
    () => this.search() !== '' || this.status() !== 'all' || this.department() !== 'all',
  );

  protected applicantCount(jobId: string): number {
    return this.applicationStore.forJob(jobId).length;
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('all');
    this.department.set('all');
  }
}
