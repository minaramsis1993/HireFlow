import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '@env/environment';

/**
 * Rewrites relative request urls (`jobs`) onto the configured API host so
 * services can stay environment-agnostic. Absolute urls pass through.
 */
export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (/^https?:\/\//i.test(request.url) || request.url.startsWith('assets/')) {
    return next(request);
  }

  const path = request.url.replace(/^\//, '');
  return next(request.clone({ url: `${environment.apiBaseUrl}/${path}` }));
};
