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

import { AiProvider } from '@core/ai/ai-provider';
import { MockAiProvider } from '@core/ai/mock-ai-provider';
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
    // The seam for CV screening. Swapping to OpenAI, Claude, Gemini or Ollama
    // means writing one class against `IAiProvider` and changing this line.
    // Nothing else in the app moves.
    { provide: AiProvider, useExisting: MockAiProvider },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
  ],
};
