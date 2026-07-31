import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  GeminiApiService,
  GeminiConfigurationError,
  GeminiRequestError,
  GenerateContentRequest,
} from '@core/ai/gemini-api-service';
import { GEMINI_CONFIG, GeminiConfig } from '@core/ai/gemini-config';
import { SKIP_ERROR_NOTIFICATION } from '@core/interceptors/error-interceptor';

const FAKE_KEY = 'AIza-test-key-do-not-leak';
const BASE_URL = 'https://gemini.test/v1beta';
const URL = `${BASE_URL}/models/gemini-3.6-flash:generateContent`;

const CONFIG: GeminiConfig = {
  apiKey: FAKE_KEY,
  model: 'gemini-3.6-flash',
  baseUrl: BASE_URL,
  timeoutMs: 30_000,
};

const REQUEST: GenerateContentRequest = {
  systemInstruction: { parts: [{ text: 'You are a recruiter.' }] },
  contents: [{ role: 'user', parts: [{ text: 'Screen this CV.' }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT' },
  },
};

describe('GeminiApiService', () => {
  let service: GeminiApiService;
  let http: HttpTestingController;

  function configure(config: GeminiConfig = CONFIG): void {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GEMINI_CONFIG, useValue: config },
      ],
    });

    service = TestBed.inject(GeminiApiService);
    http = TestBed.inject(HttpTestingController);
  }

  /** Starts the call, hands back the pending request and the settled promise. */
  function send(): { pending: Promise<string>; request: TestRequest } {
    const pending = service.generate(REQUEST);
    return { pending, request: http.expectOne(URL) };
  }

  afterEach(() => {
    http.verify();
  });

  describe('with a configured key', () => {
    beforeEach(() => configure());

    it('posts the request to the model endpoint', async () => {
      const { pending, request } = send();
      request.flush(textResponse('{"summary":"ok"}'));

      await pending;
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(REQUEST);
    });

    // A query key leaks into `HttpErrorResponse.url`, devtools and request logs.
    it('sends the key as a header, never as a query parameter', async () => {
      const { pending, request } = send();
      request.flush(textResponse('{"summary":"ok"}'));

      await pending;
      expect(request.request.headers.get('x-goog-api-key')).toBe(FAKE_KEY);
      expect(request.request.urlWithParams).not.toContain('key=');
    });

    // The evaluation card shows the failure itself; a toast would double it.
    it('opts out of the global error snackbar', async () => {
      const { pending, request } = send();
      request.flush(textResponse('{"summary":"ok"}'));

      await pending;
      expect(request.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    });

    it('concatenates the parts of the first candidate', async () => {
      const { pending, request } = send();
      request.flush({
        candidates: [
          {
            finishReason: 'STOP',
            content: { parts: [{ text: '{"summary":' }, { text: '"split across parts"}' }] },
          },
        ],
      });

      expect(await pending).toBe('{"summary":"split across parts"}');
    });

    it('rejects a prompt blocked by the safety filters', async () => {
      const { pending, request } = send();
      request.flush({ promptFeedback: { blockReason: 'SAFETY' } });

      await expectAsync(pending).toBeRejectedWithError(GeminiRequestError, /safety filters/);
    });

    // Partial JSON that happens to parse would become a plausible but wrong
    // evaluation, so a truncated candidate is rejected before its text is read.
    it('rejects a truncated response even when it carries text', async () => {
      const { pending, request } = send();
      request.flush({
        candidates: [
          { finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"summary":"h' }] } },
        ],
      });

      await expectAsync(pending).toBeRejectedWithError(GeminiRequestError, /cut short/);
    });

    it('rejects a response with no candidates', async () => {
      const { pending, request } = send();
      request.flush({ candidates: [] });

      await expectAsync(pending).toBeRejectedWithError(GeminiRequestError, /no result/);
    });

    it('rejects a candidate whose parts are empty', async () => {
      const { pending, request } = send();
      request.flush({ candidates: [{ finishReason: 'STOP', content: { parts: [] } }] });

      await expectAsync(pending).toBeRejectedWithError(GeminiRequestError, /empty response/);
    });

    it('explains each transport failure in its own words', async () => {
      const cases: readonly { status: number; matcher: RegExp }[] = [
        { status: 0, matcher: /could not be reached/ },
        { status: 401, matcher: /API key was rejected/ },
        { status: 404, matcher: /model is not available/ },
        { status: 429, matcher: /rate limit/ },
        { status: 500, matcher: /status 500/ },
      ];

      for (const { status, matcher } of cases) {
        const { pending, request } = send();
        request.flush('nope', { status, statusText: 'Error' });

        await expectAsync(pending).toBeRejectedWithError(GeminiRequestError, matcher);
      }
    });

    // Error messages land verbatim on the evaluation card.
    it('never puts the API key in an error message', async () => {
      const { pending, request } = send();
      request.flush(
        { error: { message: `Invalid key ${FAKE_KEY}` } },
        { status: 403, statusText: 'Forbidden' },
      );

      const error = await rejection(pending);
      expect(error.message).toContain('API key was rejected');
      expect(error.message).not.toContain(FAKE_KEY);
    });

    it('reports the status on the error', async () => {
      const { pending, request } = send();
      request.flush('slow down', { status: 429, statusText: 'Too Many Requests' });

      const error = await rejection<GeminiRequestError>(pending);
      expect(error.status).toBe(429);
    });
  });

  describe('with no key', () => {
    beforeEach(() => configure({ ...CONFIG, apiKey: '   ' }));

    it('is not configured', () => {
      expect(service.configured).toBe(false);
    });

    it('throws without sending anything', async () => {
      await expectAsync(service.generate(REQUEST)).toBeRejectedWithError(GeminiConfigurationError);
      http.expectNone(() => true);
    });
  });
});

/** Minimal well-formed response carrying one text part. */
function textResponse(text: string): object {
  return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] };
}

/** The rejection reason, typed — `catch` alone widens it with the resolved type. */
async function rejection<T extends Error>(pending: Promise<unknown>): Promise<T> {
  try {
    await pending;
    throw new Error('Expected the call to be rejected.');
  } catch (cause) {
    return cause as T;
  }
}
