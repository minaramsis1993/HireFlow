import { Routes } from '@angular/router';

/**
 * Every feature is lazily loaded so the initial bundle only carries the shell.
 * Detail routes rely on `withComponentInputBinding()` to bind `:id` to an input.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('@features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'jobs',
        loadChildren: () => import('@features/jobs/jobs.routes').then((m) => m.JOBS_ROUTES),
      },
      {
        path: 'candidates',
        loadChildren: () =>
          import('@features/candidates/candidates.routes').then((m) => m.CANDIDATES_ROUTES),
      },
      {
        path: 'pipeline',
        title: 'Pipeline',
        loadComponent: () => import('@features/pipeline/pipeline').then((m) => m.Pipeline),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('@features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
