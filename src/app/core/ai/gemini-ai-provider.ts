import { inject, Injectable } from '@angular/core';

import { extractJsonObject } from '@core/models';
import { AiPrompt, AiProvider } from '@core/ai/ai-provider';
import {
  GeminiApiService,
  GeminiSchema,
  GenerateContentRequest,
} from '@core/ai/gemini-api-service';
import { MockAiProvider } from '@core/ai/mock-ai-provider';

/**
 * The evaluation shape, in Gemini's schema dialect.
 *
 * It mirrors the JSON the system prompt asks for, so the model is constrained
 * as well as instructed. `recommendedStage` is narrowed to the four stages a
 * screener can actually recommend — `toStage` still normalises the result, so
 * a model that ignores the enum cannot produce an invalid stage either way.
 */
const EVALUATION_FIELDS = [
  'rating',
  'matchScore',
  'summary',
  'strengths',
  'weaknesses',
  'missingSkills',
  'recommendedStage',
  'interviewQuestions',
] as const;

const EVALUATION_SCHEMA: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    rating: {
      type: 'INTEGER',
      minimum: 1,
      maximum: 5,
      description: 'Overall 1-5, matching a recruiter scorecard.',
    },
    matchScore: {
      type: 'INTEGER',
      minimum: 0,
      maximum: 100,
      description: 'Fit against the job description, 0-100.',
    },
    summary: { type: 'STRING', description: '2-3 sentences a recruiter can act on.' },
    strengths: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Evidenced in the résumé; cite what you saw.',
    },
    weaknesses: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Requirements the résumé does not support.',
    },
    missingSkills: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Short skill names only, e.g. "AWS", "GraphQL".',
    },
    recommendedStage: {
      type: 'STRING',
      enum: ['screening', 'interview', 'offer', 'rejected'],
    },
    interviewQuestions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      minItems: 3,
      maxItems: 5,
      description: 'Questions probing the gaps you found.',
    },
  },
  required: EVALUATION_FIELDS,
  // Gemini generates in declaration order; matching it improves adherence.
  propertyOrdering: EVALUATION_FIELDS,
};

const REPAIR_INSTRUCTION =
  'Your previous reply was not a single valid JSON object. Reply again with only the JSON ' +
  'object described by the schema — no prose, no code fences, and a non-empty "summary".';

/**
 * Screens a CV with Google Gemini.
 *
 * One `generateContent` call per evaluation, constrained to the evaluation
 * schema, with a single repair attempt if the response comes back unreadable.
 * Like every provider it returns the model's raw text — `parseAiEvaluation`
 * stays the only validator, so nothing downstream knows which model ran.
 *
 * With no API key configured it delegates to {@link MockAiProvider}, so a fresh
 * clone still demonstrates the whole pipeline offline.
 */
@Injectable({ providedIn: 'root' })
export class GeminiAiProvider extends AiProvider {
  private readonly api = inject(GeminiApiService);
  private readonly mock = inject(MockAiProvider);

  get model(): string {
    return this.api.configured ? this.api.model : this.mock.model;
  }

  async complete(prompt: AiPrompt): Promise<string> {
    if (!this.api.configured) {
      return this.mock.complete(prompt);
    }

    const first = await this.api.generate(this.request(prompt, false));
    if (isUsable(first)) {
      return first;
    }

    // Exactly one retry, and only for unreadable output — a transport failure
    // has already thrown, and burning a second paid call would not fix it.
    const second = await this.api.generate(this.request(prompt, true));

    // Still unreadable: throw the same typed error every other provider throws,
    // so the card reads the same whichever model produced the mess.
    extractJsonObject(second);

    return second;
  }

  private request(prompt: AiPrompt, repair: boolean): GenerateContentRequest {
    return {
      systemInstruction: { parts: [{ text: prompt.system }] },
      contents: [
        {
          role: 'user',
          // A second part rather than a second turn: consecutive user turns are
          // not guaranteed to be accepted, extra parts always are.
          parts: repair
            ? [{ text: prompt.user }, { text: REPAIR_INSTRUCTION }]
            : [{ text: prompt.user }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: EVALUATION_SCHEMA,
        temperature: repair ? 0 : 0.2,
        maxOutputTokens: 2048,
        candidateCount: 1,
        // Screening one CV against one job is not a reasoning problem, and the
        // default budget spends more tokens thinking than answering.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    };
  }
}

/**
 * Asks exactly what `parseAiEvaluation` will ask — parseable object, non-empty
 * summary. Anything looser retries responses that would have worked; anything
 * stricter gives up on ones that would have.
 */
function isUsable(raw: string): boolean {
  try {
    const summary = extractJsonObject(raw)['summary'];
    return typeof summary === 'string' && summary.trim().length > 0;
  } catch {
    return false;
  }
}
