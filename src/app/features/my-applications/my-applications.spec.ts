import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '@core/auth/auth-service';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';
import { MyApplications } from './my-applications';

describe('MyApplications', () => {
  let fixture: ComponentFixture<MyApplications>;
  let auth: AuthService;
  let applicationStore: ApplicationStore;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [MyApplications],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    applicationStore = TestBed.inject(ApplicationStore);
    await auth.login({ email: 'candidate@hireflow.dev', password: 'password' });

    fixture = TestBed.createComponent(MyApplications);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.card'));
  }

  it('lists only the signed-in candidate applications', () => {
    const profile = auth.candidateProfile();
    const mine = applicationStore.forCandidate(profile!.id);

    expect(rows().length).toBe(mine.length);
    expect(rows().length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain(mine[0].job.title);
  });

  it('never shows the recruiter notes', () => {
    const profile = auth.candidateProfile();
    const noted = applicationStore.forCandidate(profile!.id).find((view) => view.notes !== '');
    expect(noted).withContext('seed data should include a noted application').toBeDefined();

    expect(fixture.nativeElement.textContent).not.toContain(noted!.notes);
  });

  it('picks up a new application without a reload', async () => {
    const profile = auth.candidateProfile();
    const job = TestBed.inject(JobStore).openJobs()[0];
    const before = rows().length;

    applicationStore.apply({
      jobId: job.id,
      candidateId: profile!.id,
      coverLetter: 'Ready when you are.',
    });
    await fixture.whenStable();

    expect(rows().length).toBe(before + 1);
    expect(fixture.nativeElement.textContent).toContain('Ready when you are.');
  });
});
