import { provideLocationMocks } from '@angular/common/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AiProvider } from '@core/ai/ai-provider';
import { MockAiProvider } from '@core/ai/mock-ai-provider';
import { AuthService } from '@core/auth/auth-service';
import { routes } from './app.routes';

describe('app routes', () => {
  const recruiter = { email: 'recruiter@hireflow.dev', password: 'password' };
  const candidate = { email: 'candidate@hireflow.dev', password: 'password' };

  let router: Router;
  let harness: RouterTestingHarness | undefined;

  beforeEach(() => {
    harness = undefined;
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withComponentInputBinding()),
        provideLocationMocks(),
        // This drives the real route table, so it needs a provider — the
        // offline mock, so no spec can depend on a key or reach the network.
        { provide: AiProvider, useExisting: MockAiProvider },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  /** One harness per test — the router testing utilities allow no more. */
  async function goTo(url: string): Promise<string> {
    harness ??= await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return router.url;
  }

  it('sends a signed-out visitor to sign-in, remembering where they were going', async () => {
    expect(await goTo('/pipeline')).toBe('/login?returnUrl=%2Fpipeline');
  });

  it('lands a recruiter on the dashboard', async () => {
    await TestBed.inject(AuthService).login(recruiter);

    expect(await goTo('/')).toBe('/dashboard');
  });

  it('lands a candidate on the job board', async () => {
    await TestBed.inject(AuthService).login(candidate);

    expect(await goTo('/')).toBe('/jobs');
  });

  it('serves /jobs as the recruiter list', async () => {
    await TestBed.inject(AuthService).login(recruiter);

    await goTo('/jobs');

    const text = harness?.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Every requisition, open or archived.');
    expect(text).not.toContain('Browse what we are hiring for');
  });

  it('serves the same /jobs url as the candidate job board', async () => {
    await TestBed.inject(AuthService).login(candidate);

    await goTo('/jobs');

    expect(harness?.routeNativeElement?.textContent).toContain('Browse what we are hiring for');
  });

  it('keeps a candidate out of recruiter-only pages', async () => {
    await TestBed.inject(AuthService).login(candidate);

    expect(await goTo('/pipeline')).toBe('/jobs');
    expect(await goTo('/candidates')).toBe('/jobs');
  });

  it('keeps a recruiter out of candidate-only pages', async () => {
    await TestBed.inject(AuthService).login(recruiter);

    expect(await goTo('/applications')).toBe('/dashboard');
    expect(await goTo('/profile')).toBe('/dashboard');
  });

  it('keeps a signed-in user away from the sign-in page', async () => {
    await TestBed.inject(AuthService).login(recruiter);

    expect(await goTo('/login')).toBe('/dashboard');
  });
});
