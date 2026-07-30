import { Routes } from '@angular/router';

import { guestGuard } from '@core/auth/guest-guard';

/**
 * Sign-in and registration. Mounted at the root rather than under a shared
 * prefix so the URLs stay `/login` and `/register`, and kept out of the shell
 * because neither page has navigation.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Create account',
    canActivate: [guestGuard],
    loadComponent: () => import('./register/register').then((m) => m.Register),
  },
];
