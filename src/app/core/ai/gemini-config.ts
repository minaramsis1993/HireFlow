import { InjectionToken } from '@angular/core';

import { environment } from '@env/environment';

/** Everything the Gemini calls need, kept injectable so a spec can override it. */
export interface GeminiConfig {
  /** Google AI Studio key. Empty means "not configured" — no call is made. */
  readonly apiKey: string;
  /** Model id, e.g. `gemini-3.6-flash`. Stored on every evaluation as `model`. */
  readonly model: string;
  /**
   * Where `:generateContent` is called. Point this at your own backend to keep
   * the key out of the bundle; the request shape is unchanged.
   */
  readonly baseUrl: string;
  /** Abandon a generation after this long, so a hung call can't wedge the card. */
  readonly timeoutMs: number;
}

/**
 * Defaults come from the environment file, but this stays a token because the
 * karma target has no `fileReplacements` — specs compile against the production
 * `environment.ts` and need a way to supply a key without one.
 */
export const GEMINI_CONFIG = new InjectionToken<GeminiConfig>('GEMINI_CONFIG', {
  providedIn: 'root',
  factory: () => ({ ...environment.gemini }),
});
