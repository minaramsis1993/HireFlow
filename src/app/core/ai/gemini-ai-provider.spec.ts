import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AiEvaluationFormatError, parseAiEvaluation } from '@core/models';
import { AiPrompt } from '@core/ai/ai-provider';
import { GeminiAiProvider } from '@core/ai/gemini-ai-provider';
import {
  GeminiApiService,
  GeminiRequestError,
  GenerateContentRequest,
} from '@core/ai/gemini-api-service';
import { PromptBuilderService } from '@core/ai/prompt-builder-service';
import { JobStore } from '@core/services/job-store';

const GOOD_JSON = JSON.stringify({
  rating: 4,
  matchScore: 78,
  summary: 'Strong Angular evidence, thin on backend work.',
  strengths: ['Angular for seven years'],
  weaknesses: ['No Go experience'],
  missingSkills: ['Go'],
  recommendedStage: 'interview',
  interviewQuestions: ['Walk us through your design system work.'],
});

/** Queue-driven stand-in for the REST call, so no spec touches HttpClient. */
class FakeGeminiApi {
  configured = true;
  model = 'gemini-3.6-flash';
  /** Consumed in order; each entry is either text to return or an error to throw. */
  queue: (string | Error)[] = [];
  readonly requests: GenerateContentRequest[] = [];

  async generate(request: GenerateContentRequest): Promise<string> {
    this.requests.push(request);

    const next = this.queue.shift();
    if (next === undefined) {
      throw new Error('FakeGeminiApi was called more times than the spec queued.');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  }
}

describe('GeminiAiProvider', () => {
  let provider: GeminiAiProvider;
  let api: FakeGeminiApi;
  let prompt: AiPrompt;

  beforeEach(() => {
    api = new FakeGeminiApi();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GeminiApiService, useValue: api }],
    });

    provider = TestBed.inject(GeminiAiProvider);

    const job = TestBed.inject(JobStore).jobs()[0];
    prompt = TestBed.inject(PromptBuilderService).build({
      job,
      resumeText: 'Angular, TypeScript and design systems for seven years.',
    });
  });

  it('reports the configured model id', () => {
    expect(provider.model).toBe('gemini-3.6-flash');
  });

  it('returns the first response when it is usable, in one call', async () => {
    api.queue = [GOOD_JSON];

    expect(await provider.complete(prompt)).toBe(GOOD_JSON);
    expect(api.requests.length).toBe(1);
  });

  it('sends the prompt as a system instruction and a user turn', async () => {
    api.queue = [GOOD_JSON];
    await provider.complete(prompt);

    const [request] = api.requests;
    expect(request.systemInstruction?.parts[0].text).toBe(prompt.system);
    expect(request.contents[0].parts[0].text).toBe(prompt.user);
    expect(request.contents[0].role).toBe('user');
  });

  it('constrains the response to the evaluation schema', async () => {
    api.queue = [GOOD_JSON];
    await provider.complete(prompt);

    const { generationConfig } = api.requests[0];
    expect(generationConfig.responseMimeType).toBe('application/json');

    const schema = generationConfig.responseSchema;
    expect(schema.type).toBe('OBJECT');
    expect(schema.required).toEqual([
      'rating',
      'matchScore',
      'summary',
      'strengths',
      'weaknesses',
      'missingSkills',
      'recommendedStage',
      'interviewQuestions',
    ]);
    expect(schema.properties?.['recommendedStage'].enum).toEqual([
      'screening',
      'interview',
      'offer',
      'rejected',
    ]);
  });

  it('retries exactly once when the first response is not JSON', async () => {
    api.queue = ['I cannot help with that.', GOOD_JSON];

    expect(await provider.complete(prompt)).toBe(GOOD_JSON);
    expect(api.requests.length).toBe(2);
  });

  // The retry has to ask the same question `parseAiEvaluation` asks, or a
  // response it would reject slips through unretried.
  it('retries when the JSON parses but carries no summary', async () => {
    api.queue = [JSON.stringify({ rating: 4, summary: '   ' }), GOOD_JSON];

    expect(await provider.complete(prompt)).toBe(GOOD_JSON);
    expect(api.requests.length).toBe(2);
  });

  it('spells out the failure on the retry and drops the temperature', async () => {
    api.queue = ['not json', GOOD_JSON];
    await provider.complete(prompt);

    const repair = api.requests[1];
    expect(repair.contents[0].parts.length).toBe(2);
    expect(repair.contents[0].parts[1].text).toContain('not a single valid JSON object');
    expect(repair.generationConfig.temperature).toBe(0);
  });

  it('throws a typed error when the retry is unusable too', async () => {
    api.queue = ['not json', 'still not json'];

    await expectAsync(provider.complete(prompt)).toBeRejectedWithError(
      AiEvaluationFormatError,
      /not valid JSON/,
    );
    expect(api.requests.length).toBe(2);
  });

  // Retrying is for unreadable output, not for a transport failure a second
  // paid call would not fix.
  it('does not retry a request failure', async () => {
    api.queue = [new GeminiRequestError('the rate limit was reached.', 429)];

    await expectAsync(provider.complete(prompt)).toBeRejectedWithError(GeminiRequestError);
    expect(api.requests.length).toBe(1);
  });

  it('produces output the shared parser accepts', async () => {
    api.queue = [GOOD_JSON];

    const evaluation = parseAiEvaluation(await provider.complete(prompt), provider.model);

    expect(evaluation.matchScore).toBe(78);
    expect(evaluation.recommendedStage).toBe('interview');
    expect(evaluation.model).toBe('gemini-3.6-flash');
  });

  describe('with no API key', () => {
    beforeEach(() => {
      api.configured = false;
    });

    it('falls back to the offline mock rather than failing', async () => {
      const evaluation = parseAiEvaluation(await provider.complete(prompt), provider.model);

      expect(evaluation.model).toBe('mock-screener-v1');
      expect(evaluation.summary).toBeTruthy();
      expect(api.requests.length).toBe(0);
    });

    it('reports the mock as the model that ran', () => {
      expect(provider.model).toBe('mock-screener-v1');
    });
  });
});
