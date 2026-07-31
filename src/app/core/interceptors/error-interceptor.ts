import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '@core/services/notification-service';

/**
 * Opts a request out of the global snackbar, for callers that already surface
 * the failure themselves. CV screening does: the message lands on the
 * evaluation card, and a toast on top of it reports the same thing twice.
 */
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

/** Surfaces transport failures once, then rethrows so callers can still react. */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!request.context.get(SKIP_ERROR_NOTIFICATION)) {
        notifications.error(toMessage(error));
      }

      return throwError(() => error);
    }),
  );
};

function toMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.status === 0) {
    return 'Cannot reach the server. Check your connection.';
  }

  return error.status === 404
    ? 'That record could not be found.'
    : `Request failed (${error.status}). Please try again.`;
}
