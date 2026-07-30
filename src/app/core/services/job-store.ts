import { computed, Injectable, signal } from '@angular/core';

import { SEED_JOBS } from '@core/data/seed-data';
import { Job, JobDraft, JobStatus } from '@core/models';
import { createId } from '@core/utils/id';

/**
 * Signal-based store for requisitions.
 *
 * State lives in a single writable signal and is exposed read-only; every
 * mutation goes through a method here so components stay presentational.
 * Replacing the seed data with `HttpClient` calls only touches this file.
 */
@Injectable({ providedIn: 'root' })
export class JobStore {
  private readonly state = signal<readonly Job[]>(SEED_JOBS);

  readonly jobs = this.state.asReadonly();

  readonly openJobs = computed(() => this.state().filter((job) => job.status === 'open'));

  readonly departments = computed(() =>
    [...new Set(this.state().map((job) => job.department))].sort(),
  );

  /** Reads inside a `computed` stay reactive to store changes. */
  byId(id: string): Job | undefined {
    return this.state().find((job) => job.id === id);
  }

  add(draft: JobDraft): Job {
    const job: Job = { ...draft, id: createId('job'), createdAt: new Date().toISOString() };
    this.state.update((jobs) => [job, ...jobs]);
    return job;
  }

  update(id: string, changes: Partial<JobDraft>): void {
    this.state.update((jobs) => jobs.map((job) => (job.id === id ? { ...job, ...changes } : job)));
  }

  changeStatus(id: string, status: JobStatus): void {
    this.update(id, { status });
  }

  remove(id: string): void {
    this.state.update((jobs) => jobs.filter((job) => job.id !== id));
  }
}
