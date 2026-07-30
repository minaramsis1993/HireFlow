import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '@core/auth/auth-service';
import { CandidateStore } from '@core/services/candidate-store';

describe('AuthService', () => {
  const recruiter = { email: 'recruiter@hireflow.dev', password: 'password' };
  const candidate = { email: 'candidate@hireflow.dev', password: 'password' };

  function configure(): AuthService {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts signed out', () => {
    const auth = configure();

    expect(auth.isAuthenticated()).toBeFalse();
    expect(auth.role()).toBeNull();
    expect(auth.homeRoute()).toBe('/login');
  });

  it('signs a recruiter in and sends them to the dashboard', async () => {
    const auth = configure();

    const result = await auth.login(recruiter);

    expect(result.ok).toBeTrue();
    expect(auth.isRecruiter()).toBeTrue();
    expect(auth.homeRoute()).toBe('/dashboard');
  });

  it('sends a candidate to the job board', async () => {
    const auth = configure();

    await auth.login(candidate);

    expect(auth.isCandidate()).toBeTrue();
    expect(auth.homeRoute()).toBe('/jobs');
  });

  it('rejects the wrong password without starting a session', async () => {
    const auth = configure();

    const result = await auth.login({ email: recruiter.email, password: 'nope' });

    expect(result.ok).toBeFalse();
    expect(auth.isAuthenticated()).toBeFalse();
  });

  it('ignores casing and padding around the email', async () => {
    const auth = configure();

    const result = await auth.login({ email: '  Recruiter@HireFlow.dev ', password: 'password' });

    expect(result.ok).toBeTrue();
  });

  it('registers a candidate and gives them a talent-pool profile', async () => {
    const auth = configure();
    const candidates = TestBed.inject(CandidateStore);
    const before = candidates.candidates().length;

    const result = await auth.register({
      fullName: 'Rita Novak',
      email: 'rita@example.com',
      password: 'hunter-two',
      role: 'candidate',
    });

    expect(result.ok).toBeTrue();
    expect(candidates.candidates().length).toBe(before + 1);

    const profile = auth.candidateProfile();
    expect(profile?.firstName).toBe('Rita');
    expect(profile?.lastName).toBe('Novak');
    expect(profile?.email).toBe('rita@example.com');
  });

  it('does not create a profile for a recruiter', async () => {
    const auth = configure();
    const candidates = TestBed.inject(CandidateStore);
    const before = candidates.candidates().length;

    await auth.register({
      fullName: 'Sam Hart',
      email: 'sam@hireflow.dev',
      password: 'hunter-two',
      role: 'recruiter',
    });

    expect(candidates.candidates().length).toBe(before);
    expect(auth.candidateProfile()).toBeUndefined();
  });

  it('claims an existing candidate record with the same email', async () => {
    const auth = configure();
    const candidates = TestBed.inject(CandidateStore);
    const sourced = candidates.candidates().find((entry) => entry.userId === null);
    expect(sourced).toBeDefined();
    const before = candidates.candidates().length;

    await auth.register({
      fullName: `${sourced!.firstName} ${sourced!.lastName}`,
      email: sourced!.email,
      password: 'hunter-two',
      role: 'candidate',
    });

    expect(candidates.candidates().length).toBe(before);
    expect(auth.candidateProfile()?.id).toBe(sourced!.id);
  });

  it('refuses a duplicate email', async () => {
    const auth = configure();

    const result = await auth.register({
      fullName: 'Impostor',
      email: recruiter.email,
      password: 'hunter-two',
      role: 'candidate',
    });

    expect(result.ok).toBeFalse();
    expect(auth.isAuthenticated()).toBeFalse();
  });

  it('restores the session after a reload', async () => {
    await configure().login(recruiter);

    TestBed.resetTestingModule();
    const restored = configure();

    expect(restored.isAuthenticated()).toBeTrue();
    expect(restored.user()?.email).toBe(recruiter.email);
  });

  it('keeps registered accounts across a reload', async () => {
    await configure().register({
      fullName: 'Rita Novak',
      email: 'rita@example.com',
      password: 'hunter-two',
      role: 'candidate',
    });

    TestBed.resetTestingModule();
    const reloaded = configure();
    reloaded.logout();
    const result = await reloaded.login({ email: 'rita@example.com', password: 'hunter-two' });

    expect(result.ok).toBeTrue();
  });

  it('drops the session on sign out', async () => {
    const auth = configure();
    await auth.login(recruiter);

    auth.logout();

    expect(auth.isAuthenticated()).toBeFalse();

    TestBed.resetTestingModule();
    expect(configure().isAuthenticated()).toBeFalse();
  });
});
