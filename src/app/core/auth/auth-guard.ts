import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth-service';

/**
 * Blocks the authenticated shell for signed-out visitors and remembers where
 * they were heading so sign-in can send them back.
 *
 * Client-side only — the real check belongs on the server once one exists.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return (
    auth.isAuthenticated() ||
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};
