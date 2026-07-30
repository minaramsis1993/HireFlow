import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { isActiveStage, PIPELINE_STAGES } from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { CandidateStore } from '@core/services/candidate-store';
import { JobStore } from '@core/services/job-store';

describe('ApplicationStore', () => {
  let store: ApplicationStore;
  let jobStore: JobStore;
  let candidateStore: CandidateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    store = TestBed.inject(ApplicationStore);
    jobStore = TestBed.inject(JobStore);
    candidateStore = TestBed.inject(CandidateStore);
  });

  it('joins each application with its job and candidate', () => {
    const view = store.views()[0];

    expect(view.job.id).toBe(view.jobId);
    expect(view.candidate.id).toBe(view.candidateId);
  });

  it('drops views whose job no longer exists', () => {
    const jobId = store.views()[0].jobId;
    const before = store.views().length;

    jobStore.remove(jobId);

    expect(store.views().length).toBeLessThan(before);
    expect(store.views().some((view) => view.jobId === jobId)).toBeFalse();
  });

  it('buckets applications into every pipeline stage, in order', () => {
    expect(store.byStage().map((bucket) => bucket.stage)).toEqual([...PIPELINE_STAGES]);
  });

  it('recomputes buckets when an application moves stage', () => {
    const application = store.views().find((view) => view.stage !== 'hired');
    expect(application).toBeDefined();

    store.moveToStage(application!.id, 'hired');

    const hired = store.byStage().find((bucket) => bucket.stage === 'hired');
    expect(hired?.applications.some((view) => view.id === application!.id)).toBeTrue();
  });

  it('counts only active stages towards activeCount', () => {
    const expected = store.views().filter((view) => isActiveStage(view.stage)).length;
    expect(store.activeCount()).toBe(expected);
  });

  it('creates new applications in the applied stage', () => {
    const jobId = jobStore.jobs()[0].id;
    const candidateId = candidateStore.candidates()[0].id;

    const created = store.apply(jobId, candidateId);

    expect(created.stage).toBe('applied');
    expect(created.rating).toBeNull();
    expect(store.forJob(jobId).some((view) => view.id === created.id)).toBeTrue();
  });

  it('stamps updatedAt when a stage changes', () => {
    const application = store.applications()[0];
    store.moveToStage(application.id, 'screening');

    const updated = store.applications().find((a) => a.id === application.id);
    expect(updated!.updatedAt >= application.updatedAt).toBeTrue();
  });
});
