import { computed, inject, Injectable, signal } from '@angular/core';

import { SEED_APPLICATIONS } from '@core/data/seed-data';
import {
  AiEvaluation,
  Application,
  ApplicationDraft,
  ApplicationView,
  isActiveStage,
  PIPELINE_STAGES,
  PipelineStage,
} from '@core/models';
import { CandidateStore } from '@core/services/candidate-store';
import { JobStore } from '@core/services/job-store';
import { createId } from '@core/utils/id';

export interface StageBucket {
  readonly stage: PipelineStage;
  readonly applications: readonly ApplicationView[];
}

@Injectable({ providedIn: 'root' })
export class ApplicationStore {
  private readonly jobStore = inject(JobStore);
  private readonly candidateStore = inject(CandidateStore);

  private readonly state = signal<readonly Application[]>(SEED_APPLICATIONS);

  readonly applications = this.state.asReadonly();

  /**
   * Applications joined with their job and candidate. Rows whose related
   * records no longer exist are dropped rather than rendered half-empty.
   */
  readonly views = computed<readonly ApplicationView[]>(() =>
    this.state().flatMap((application) => {
      const job = this.jobStore.byId(application.jobId);
      const candidate = this.candidateStore.byId(application.candidateId);
      return job && candidate ? [{ ...application, job, candidate }] : [];
    }),
  );

  readonly activeCount = computed(
    () => this.views().filter((view) => isActiveStage(view.stage)).length,
  );

  readonly hiredCount = computed(
    () => this.views().filter((view) => view.stage === 'hired').length,
  );

  /** One bucket per stage, in pipeline order — drives the kanban board. */
  readonly byStage = computed<readonly StageBucket[]>(() => {
    const views = this.views();
    return PIPELINE_STAGES.map((stage) => ({
      stage,
      applications: views.filter((view) => view.stage === stage),
    }));
  });

  readonly recent = computed(() =>
    [...this.views()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
  );

  forJob(jobId: string): readonly ApplicationView[] {
    return this.views().filter((view) => view.jobId === jobId);
  }

  forCandidate(candidateId: string): readonly ApplicationView[] {
    return this.views().filter((view) => view.candidateId === candidateId);
  }

  moveToStage(id: string, stage: PipelineStage): void {
    this.patch(id, { stage });
  }

  rate(id: string, rating: number): void {
    this.patch(id, { rating });
  }

  addNote(id: string, notes: string): void {
    this.patch(id, { notes });
  }

  /**
   * Stores a screening result and the CV text it was derived from.
   *
   * Deliberately bypasses `patch`: that stamps `updatedAt`, which `recent`
   * sorts on. Screening runs in the background minutes after a candidate
   * applies, and it is not recruiter activity — letting it touch `updatedAt`
   * would silently reshuffle the dashboard's recent list.
   */
  attachEvaluation(id: string, evaluation: AiEvaluation, resumeText: string): void {
    this.state.update((applications) =>
      applications.map((application) =>
        application.id === id
          ? { ...application, aiEvaluation: evaluation, resumeText }
          : application,
      ),
    );
  }

  /** Every application starts in `applied`, wherever it was submitted from. */
  apply(draft: ApplicationDraft): Application {
    const now = new Date().toISOString();
    const application: Application = {
      id: createId('app'),
      jobId: draft.jobId,
      candidateId: draft.candidateId,
      stage: 'applied',
      rating: null,
      appliedAt: now,
      updatedAt: now,
      notes: '',
      coverLetter: draft.coverLetter?.trim() ?? '',
      resume: draft.resume ?? null,
      resumeText: null,
      aiEvaluation: null,
    };
    this.state.update((applications) => [application, ...applications]);
    return application;
  }

  hasApplied(candidateId: string, jobId: string): boolean {
    return this.state().some(
      (application) => application.candidateId === candidateId && application.jobId === jobId,
    );
  }

  remove(id: string): void {
    this.state.update((applications) => applications.filter((a) => a.id !== id));
  }

  private patch(id: string, changes: Partial<Omit<Application, 'id'>>): void {
    this.state.update((applications) =>
      applications.map((application) =>
        application.id === id
          ? { ...application, ...changes, updatedAt: new Date().toISOString() }
          : application,
      ),
    );
  }
}
