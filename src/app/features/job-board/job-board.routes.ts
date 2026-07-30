import { Routes } from '@angular/router';

/** Candidate half of `/jobs`; the recruiter list is `@features/jobs`. */
export const JOB_BOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Open roles',
    loadComponent: () => import('./job-board').then((m) => m.JobBoard),
  },
];
