import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { JobStore } from '@core/services/job-store';
import { JobList } from './job-list';

describe('JobList', () => {
  let fixture: ComponentFixture<JobList>;
  let jobStore: JobStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobList],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(JobList);
    jobStore = TestBed.inject(JobStore);
    await fixture.whenStable();
  });

  function rowCount(): number {
    return fixture.nativeElement.querySelectorAll('tr[mat-row]').length;
  }

  it('renders one row per job', () => {
    expect(rowCount()).toBe(jobStore.jobs().length);
  });

  it('reacts to a search term', async () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'Product Designer';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(rowCount()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Product Designer');
  });

  it('shows the empty state when nothing matches', async () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'zzzz-no-such-role';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No jobs match those filters');
  });

  it('re-renders when a job is added to the store', async () => {
    const before = rowCount();

    jobStore.add({
      title: 'Security Engineer',
      department: 'Engineering',
      location: 'Remote, EU',
      workMode: 'remote',
      employmentType: 'full-time',
      status: 'open',
      openings: 1,
      salary: { min: 80000, max: 100000, currency: 'EUR' },
      description: 'Harden the platform.',
      requirements: ['Threat modelling'],
      hiringManager: 'Dana Ruiz',
    });
    await fixture.whenStable();

    expect(rowCount()).toBe(before + 1);
  });
});
