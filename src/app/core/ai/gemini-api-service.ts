import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

import { GEMINI_CONFIG } from '@core/ai/gemini-config';
import { SKIP_ERROR_NOTIFICATION } from '@core/interceptors/error-interceptor';

/**
 * Gemini's schema dialect — the OpenAPI subset it accepts, and only the parts
 * used here. `additionalProperties`, `$ref` and a top-level `oneOf` are all
 * rejected by the API, so they are deliberately absent.
 */
export interface GeminiSchema {
  readonly type: 'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN';
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly items?: GeminiSchema;
  readonly properties?: Readonly<Record<string, GeminiSchema>>;
  readonly required?: readonly string[];
  readonly propertyOrdering?: readonly string[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface GeminiPart {
  readonly text: string;
}

export interface GeminiContent {
  readonly role?: 'user' | 'model';
  readonly parts: readonly GeminiPart[];
}

export interface GeminiGenerationConfig {
  readonly responseMimeType: 'application/json';
  readonly responseSchema: GeminiSchema;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly candidateCount?: number;
  /**
   * Gemini 3 thinks before it answers, and those tokens are billed against
   * `maxOutputTokens` — left alone, a long CV can burn the budget on reasoning
   * and come back `MAX_TOKENS` with no evaluation in it.
   */
  readonly thinkingConfig?: { readonly thinkingLevel: 'low' | 'high' };
}

export interface GenerateContentRequest {
  readonly systemInstruction?: { readonly parts: readonly GeminiPart[] };
  readonly contents: readonly GeminiContent[];
  readonly generationConfig: GeminiGenerationConfig;
}

/** Every field is optional: a block or an error drops most of the response. */
interface GenerateContentResponse {
  readonly candidates?: readonly {
    readonly content?: { readonly parts?: readonly { readonly text?: string }[] };
    readonly finishReason?: string;
  }[];
  readonly promptFeedback?: { readonly blockReason?: string };
}

/** Raised when there is no usable API key, so nothing was sent. */
export class GeminiConfigurationError extends Error {
  constructor() {
    super('AI screening is not configured — no Gemini API key is set for this build.');
    this.name = 'GeminiConfigurationError';
  }
}

/**
 * Raised when the call was made and did not come back usable.
 *
 * `AiEvaluationService` puts `message` straight onto the evaluation card, so
 * everything here is user-facing: never interpolate the key, the URL or the
 * response body into it.
 */
export class GeminiRequestError extends Error {
  constructor(
    reason: string,
    readonly status: number | null = null,
  ) {
    super(`The AI service could not complete the request: ${reason}`);
    this.name = 'GeminiRequestError';
  }
}

/**
 * One `generateContent` call against the Gemini REST API.
 *
 * Transport only — it knows nothing about evaluations or prompts, which keeps
 * `GeminiAiProvider` free to own the schema and the retry policy.
 */
@Injectable({ providedIn: 'root' })
export class GeminiApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(GEMINI_CONFIG);

  /** Model id the calls are made against. */
  get model(): string {
    return this.config.model;
  }

  /** Whether a key is present. `false` is what triggers the offline fallback. */
  get configured(): boolean {
    return this.config.apiKey.trim().length > 0;
  }

  /** Sends one request and resolves with the model's text. */
  async generate(request: GenerateContentRequest): Promise<string> {
    if (!this.configured) {
      throw new GeminiConfigurationError();
    }

    const url = `${this.config.baseUrl}/models/${encodeURIComponent(this.config.model)}:generateContent`;

    let response: GenerateContentResponse;
    try {
      response = await firstValueFrom(
        this.http
          .post<GenerateContentResponse>(url, request, {
            // Header rather than `?key=`: a query key ends up in
            // `HttpErrorResponse.url`, in devtools, and in any request log.
            headers: new HttpHeaders({
              'Content-Type': 'application/json',
              'x-goog-api-key': this.config.apiKey,
            }),
            // The card reports this failure itself; the global snackbar doubles it.
            context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
          })
          .pipe(timeout(this.config.timeoutMs)),
      );
    } catch (cause) {
      throw toRequestError(cause);
    }

    return textOf(response);
  }
}

/** Maps a transport failure onto a fixed, user-safe message. Status only. */
function toRequestError(cause: unknown): GeminiRequestError {
  if (cause instanceof TimeoutError) {
    return new GeminiRequestError('the model did not respond in time.');
  }

  if (!(cause instanceof HttpErrorResponse)) {
    return new GeminiRequestError('the request could not be sent.');
  }

  switch (cause.status) {
    case 0:
      return new GeminiRequestError('the AI service could not be reached.', 0);
    case 400:
      return new GeminiRequestError('the request was rejected as malformed.', 400);
    case 401:
    case 403:
      return new GeminiRequestError('the configured API key was rejected.', cause.status);
    case 404:
      return new GeminiRequestError('the configured model is not available.', 404);
    case 429:
      return new GeminiRequestError('the rate limit was reached. Try again shortly.', 429);
    default:
      return new GeminiRequestError(`it failed with status ${cause.status}.`, cause.status);
  }
}

/**
 * Pulls the text out of a response, or explains why there isn't any.
 *
 * The order matters: a blocked or truncated candidate can still carry partial
 * text, and partial JSON that happens to parse would become a plausible but
 * wrong evaluation. Every reason to reject is checked before `parts` is read.
 */
function textOf(response: GenerateContentResponse): string {
  if (response.promptFeedback?.blockReason) {
    throw new GeminiRequestError("the CV was blocked by the model's safety filters.");
  }

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new GeminiRequestError('the model returned no result.');
  }

  const { finishReason } = candidate;
  if (finishReason && finishReason !== 'STOP') {
    throw new GeminiRequestError(
      finishReason === 'MAX_TOKENS'
        ? 'the response was cut short before it finished.'
        : 'the model stopped before finishing.',
    );
  }

  // A candidate holds a list of parts; concatenating them is how it is read.
  const text = (candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new GeminiRequestError('the model returned an empty response.');
  }

  return text;
}
