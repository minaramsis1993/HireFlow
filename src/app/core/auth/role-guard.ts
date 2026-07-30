import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth-service';
import { UserRole } from '@core/models';
import { NotificationService } from '@core/services/notification-service';

/**
 * Restricts a route to the given roles, bouncing anyone else to their own home
 * page rather than showing an empty screen.
 */
export function roleGuard(...roles: readonly UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();

    if (role !== null && roles.includes(role)) {
      return true;
    }

    if (role !== null) {
      inject(NotificationService).error('That page is not available for your account.');
    }

    return router.parseUrl(auth.homeRoute());
  };
}

/**
 * `canMatch` variant, for two routes that share a path and differ by role — the
 * router falls through to the next candidate instead of cancelling navigation.
 * `/jobs` uses this to serve the recruiter list or the candidate job board.
 */
export function roleMatch(...roles: readonly UserRole[]): CanMatchFn {
  return () => {
    const role = inject(AuthService).role();
    return role !== null && roles.includes(role);
  };
}
