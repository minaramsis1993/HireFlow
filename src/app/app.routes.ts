import { inject } from '@angular/core';
import { RedirectFunction, Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth-guard';
import { AuthService } from '@core/auth/auth-service';
import { roleGuard, roleMatch } from '@core/auth/role-guard';
import { AUTH_ROUTES } from '@features/auth/auth.routes';

/** Recruiters land on the dashboard, candidates on the job board. */
const toRoleHome: RedirectFunction = () => inject(AuthService).homeRoute();

/**
 * Every feature is lazily loaded so the initial bundle only carries the shell.
 * Detail routes rely on `withComponentInputBinding()` to bind `:id` to an input.
 *
 * Access is layered: `authGuard` protects the shell, `roleGuard` protects the
 * pages only one role may open, and `/jobs` uses `canMatch` so recruiters and
 * candidates get different components behind the same URL.
 */
export const routes: Routes = [
  ...AUTH_ROUTES,
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: toRoleHome },
      {
        path: 'dashboard',
        title: 'Dashboard',
        canActivate: [roleGuard('recruiter')],
        loadComponent: () => import('@features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'jobs',
        canMatch: [roleMatch('recruiter')],
        loadChildren: () => import('@features/jobs/jobs.routes').then((m) => m.JOBS_ROUTES),
      },
      {
        path: 'jobs',
        canMatch: [roleMatch('candidate')],
        loadChildren: () =>
          import('@features/job-board/job-board.routes').then((m) => m.JOB_BOARD_ROUTES),
      },
      {
        path: 'candidates',
        canActivate: [roleGuard('recruiter')],
        loadChildren: () =>
          import('@features/candidates/candidates.routes').then((m) => m.CANDIDATES_ROUTES),
      },
      {
        path: 'pipeline',
        title: 'Pipeline',
        canActivate: [roleGuard('recruiter')],
        loadComponent: () => import('@features/pipeline/pipeline').then((m) => m.Pipeline),
      },
      {
        path: 'applications',
        title: 'My applications',
        canActivate: [roleGuard('candidate')],
        loadComponent: () =>
          import('@features/my-applications/my-applications').then((m) => m.MyApplications),
      },
      {
        path: 'profile',
        title: 'My profile',
        canActivate: [roleGuard('candidate')],
        loadComponent: () => import('@features/profile/profile').then((m) => m.Profile),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('@features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
