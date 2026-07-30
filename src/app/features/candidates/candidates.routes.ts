import { Routes } from '@angular/router';

export const CANDIDATES_ROUTES: Routes = [
  {
    path: '',
    title: 'Candidates',
    loadComponent: () => import('./candidate-list/candidate-list').then((m) => m.CandidateList),
  },
  {
    path: ':id',
    title: 'Candidate profile',
    loadComponent: () =>
      import('./candidate-detail/candidate-detail').then((m) => m.CandidateDetail),
  },
];
