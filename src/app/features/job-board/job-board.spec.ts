import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AiProvider } from '@core/ai/ai-provider';
import { MockAiProvider } from '@core/ai/mock-ai-provider';
import { AuthService } from '@core/auth/auth-service';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';
import { JobBoard } from './job-board';

describe('JobBoard', () => {
  let fixture: ComponentFixture<JobBoard>;
  let auth: AuthService;
  let jobStore: JobStore;
  let applicationStore: ApplicationStore;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [JobBoard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AiProvider, useExisting: MockAiProvider },
      ],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    jobStore = TestBed.inject(JobStore);
    applicationStore = TestBed.inject(ApplicationStore);
    await auth.login({ email: 'candidate@hireflow.dev', password: 'password' });

    fixture = TestBed.createComponent(JobBoard);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function cards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.card'));
  }

  it('lists only open requisitions', () => {
    expect(cards().length).toBe(jobStore.openJobs().length);
    expect(cards().length).toBeGreaterThan(0);
  });

  it('shows the department, location and required skills', () => {
    const job = jobStore.openJobs()[0];
    const text = fixture.nativeElement.textContent;

    expect(text).toContain(job.department);
    expect(text).toContain(job.location);
    expect(text).toContain(job.requirements[0]);
  });

  it('narrows the list with a search term', async () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'zzzz-no-such-role';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(cards().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No open roles right now');
  });

  it('replaces Apply with the current stage once applied', async () => {
    const profile = auth.candidateProfile();
    expect(profile).toBeDefined();

    const target = jobStore
      .openJobs()
      .find((job) => !applicationStore.hasApplied(profile!.id, job.id));
    expect(target).toBeDefined();

    applicationStore.apply({ jobId: target!.id, candidateId: profile!.id });
    await fixture.whenStable();

    const card = cards().find((element) => element.textContent?.includes(target!.title));
    expect(card?.textContent).toContain('Applied · Applied');
    expect(card?.querySelector('button[disabled]')).not.toBeNull();
  });
});
