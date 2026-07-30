import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Route,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';

import { authGuard } from '@core/auth/auth-guard';
import { AuthService } from '@core/auth/auth-service';
import { guestGuard } from '@core/auth/guest-guard';
import { roleGuard, roleMatch } from '@core/auth/role-guard';
import { UserRole } from '@core/models';

describe('route guards', () => {
  let auth: AuthService;

  const route = {} as ActivatedRouteSnapshot;

  function stateFor(url: string): RouterStateSnapshot {
    return { url } as RouterStateSnapshot;
  }

  function runAuthGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard(route, stateFor(url))) as
      boolean | UrlTree;
  }

  function runRoleGuard(...roles: UserRole[]): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => roleGuard(...roles)(route, stateFor('/'))) as
      boolean | UrlTree;
  }

  function runRoleMatch(...roles: UserRole[]): boolean {
    return TestBed.runInInjectionContext(() =>
      roleMatch(...roles)({} as Route, [] as UrlSegment[]),
    ) as boolean;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sends a signed-out visitor to the sign-in page with a return url', () => {
    const result = runAuthGuard('/pipeline');

    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login?returnUrl=%2Fpipeline');
  });

  it('lets a signed-in user through', async () => {
    await auth.login({ email: 'recruiter@hireflow.dev', password: 'password' });

    expect(runAuthGuard('/pipeline')).toBeTrue();
  });

  it('keeps a signed-in user off the sign-in page', async () => {
    expect(TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login')))).toBeTrue();

    await auth.login({ email: 'candidate@hireflow.dev', password: 'password' });
    const result = TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login')));

    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/jobs');
  });

  it('admits the matching role', async () => {
    await auth.login({ email: 'recruiter@hireflow.dev', password: 'password' });

    expect(runRoleGuard('recruiter')).toBeTrue();
  });

  it('bounces the wrong role to its own home page', async () => {
    await auth.login({ email: 'candidate@hireflow.dev', password: 'password' });

    const result = runRoleGuard('recruiter');

    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/jobs');
  });

  it('resolves /jobs to a single role at a time', async () => {
    expect(runRoleMatch('recruiter')).toBeFalse();
    expect(runRoleMatch('candidate')).toBeFalse();

    await auth.login({ email: 'candidate@hireflow.dev', password: 'password' });

    expect(runRoleMatch('recruiter')).toBeFalse();
    expect(runRoleMatch('candidate')).toBeTrue();
  });
});
