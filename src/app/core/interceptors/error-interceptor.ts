import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '@core/services/notification-service';

/** Surfaces transport failures once, then rethrows so callers can still react. */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      notifications.error(toMessage(error));
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
