import { Routes } from '@angular/router';

export const JOBS_ROUTES: Routes = [
  {
    path: '',
    title: 'Jobs',
    loadComponent: () => import('./job-list/job-list').then((m) => m.JobList),
  },
  {
    path: 'new',
    title: 'New job',
    loadComponent: () => import('./job-form/job-form').then((m) => m.JobForm),
  },
  {
    path: ':id',
    title: 'Job details',
    loadComponent: () => import('./job-detail/job-detail').then((m) => m.JobDetail),
  },
  {
    path: ':id/edit',
    title: 'Edit job',
    loadComponent: () => import('./job-form/job-form').then((m) => m.JobForm),
  },
];
