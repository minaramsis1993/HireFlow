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

import { AiEvaluationService } from '@core/ai/ai-evaluation-service';
import { MockAiEvaluationService } from '@core/ai/mock-ai-evaluation-service';
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
    // The seam for CV screening: point this at an HTTP-backed implementation
    // and nothing else in the app changes.
    { provide: AiEvaluationService, useExisting: MockAiEvaluationService },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
  ],
};
