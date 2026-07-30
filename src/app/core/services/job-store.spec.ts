import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { JobDraft } from '@core/models';
import { JobStore } from '@core/services/job-store';

function draft(overrides: Partial<JobDraft> = {}): JobDraft {
  return {
    title: 'QA Engineer',
    department: 'Engineering',
    location: 'Berlin, DE',
    workMode: 'remote',
    employmentType: 'full-time',
    status: 'open',
    openings: 1,
    salary: { min: 50000, max: 60000, currency: 'EUR' },
    description: 'Own the automated test suite.',
    requirements: ['Playwright'],
    hiringManager: 'Dana Ruiz',
    ...overrides,
  };
}

describe('JobStore', () => {
  let store: JobStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    store = TestBed.inject(JobStore);
  });

  it('seeds the store with jobs', () => {
    expect(store.jobs().length).toBeGreaterThan(0);
  });

  it('exposes only open requisitions through openJobs', () => {
    expect(store.openJobs().every((job) => job.status === 'open')).toBeTrue();
  });

  it('prepends created jobs and assigns an id', () => {
    const before = store.jobs().length;
    const created = store.add(draft({ title: 'Site Reliability Engineer' }));

    expect(store.jobs().length).toBe(before + 1);
    expect(store.jobs()[0].id).toBe(created.id);
    expect(created.id).toMatch(/^job-/);
  });

  it('applies partial updates without touching other fields', () => {
    const created = store.add(draft());
    store.update(created.id, { openings: 4 });

    const updated = store.byId(created.id);
    expect(updated?.openings).toBe(4);
    expect(updated?.title).toBe(created.title);
  });

  it('changes status and removes jobs', () => {
    const created = store.add(draft());

    store.changeStatus(created.id, 'closed');
    expect(store.byId(created.id)?.status).toBe('closed');

    store.remove(created.id);
    expect(store.byId(created.id)).toBeUndefined();
  });

  it('derives a sorted, de-duplicated department list', () => {
    const departments = store.departments();
    expect(departments).toEqual([...new Set(departments)].sort());
  });
});
