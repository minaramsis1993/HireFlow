import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import {
  EMPLOYMENT_TYPES,
  EmploymentType,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  JobDraft,
  JobStatus,
  WORK_MODES,
  WorkMode,
} from '@core/models';
import { JobStore } from '@core/services/job-store';
import { NotificationService } from '@core/services/notification-service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';

/** Cross-field rule: the top of the band cannot sit below the bottom. */
function salaryRangeValidator(control: AbstractControl): ValidationErrors | null {
  const min = control.get('salaryMin')?.value as number;
  const max = control.get('salaryMax')?.value as number;
  return max < min ? { salaryRange: true } : null;
}

@Component({
  selector: 'app-job-form',
  imports: [
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeader,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './job-form.html',
  styleUrl: './job-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly jobStore = inject(JobStore);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** Present on `/jobs/:id/edit`, absent on `/jobs/new`. */
  readonly id = input<string>();

  protected readonly statuses = JOB_STATUSES;
  protected readonly statusLabels = JOB_STATUS_LABELS;
  protected readonly employmentTypes = EMPLOYMENT_TYPES;
  protected readonly workModes = WORK_MODES;

  protected readonly existingJob = computed(() => {
    const id = this.id();
    return id ? this.jobStore.byId(id) : undefined;
  });

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly notFound = computed(() => this.isEdit() && !this.existingJob());

  /** Fully typed, non-nullable reactive form. */
  protected readonly form = this.formBuilder.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.maxLength(80)]],
      department: ['', Validators.required],
      location: ['', Validators.required],
      workMode: this.formBuilder.nonNullable.control<WorkMode>('hybrid'),
      employmentType: this.formBuilder.nonNullable.control<EmploymentType>('full-time'),
      status: this.formBuilder.nonNullable.control<JobStatus>('draft'),
      openings: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
      hiringManager: ['', Validators.required],
      salaryMin: [50000, [Validators.required, Validators.min(0)]],
      salaryMax: [70000, [Validators.required, Validators.min(0)]],
      currency: ['EUR', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      requirements: [''],
    },
    { validators: salaryRangeValidator },
  );

  constructor() {
    // Populate the form once the edited job is available in the store.
    effect(() => {
      const job = this.existingJob();
      if (!job) {
        return;
      }

      this.form.reset({
        title: job.title,
        department: job.department,
        location: job.location,
        workMode: job.workMode,
        employmentType: job.employmentType,
        status: job.status,
        openings: job.openings,
        hiringManager: job.hiringManager,
        salaryMin: job.salary.min,
        salaryMax: job.salary.max,
        currency: job.salary.currency,
        description: job.description,
        requirements: job.requirements.join('\n'),
      });
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const draft: JobDraft = {
      title: value.title.trim(),
      department: value.department.trim(),
      location: value.location.trim(),
      workMode: value.workMode,
      employmentType: value.employmentType,
      status: value.status,
      openings: value.openings,
      hiringManager: value.hiringManager.trim(),
      salary: { min: value.salaryMin, max: value.salaryMax, currency: value.currency },
      description: value.description.trim(),
      requirements: value.requirements
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    const id = this.id();
    if (id) {
      this.jobStore.update(id, draft);
      this.notifications.success('Job updated.');
      void this.router.navigate(['/jobs', id]);
      return;
    }

    const created = this.jobStore.add(draft);
    this.notifications.success('Job created.');
    void this.router.navigate(['/jobs', created.id]);
  }
}
