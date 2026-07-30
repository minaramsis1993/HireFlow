import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { AppTitleStrategy } from '@core/app-title-strategy';
import { apiBaseUrlInterceptor } from '@core/interceptors/api-base-url-interceptor';
import { errorInterceptor } from '@core/interceptors/error-interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless: change detection is driven by signals, not zone.js patching.
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Route params/data are bound straight to component `input()`s.
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([apiBaseUrlInterceptor, errorInterceptor])),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
  ],
};
