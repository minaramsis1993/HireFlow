import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AiEvaluation, Job, parseAiEvaluation } from '@core/models';
import { AiProvider } from '@core/ai/ai-provider';
import { MockAiProvider } from '@core/ai/mock-ai-provider';
import { PromptBuilderService } from '@core/ai/prompt-builder-service';
import { JobStore } from '@core/services/job-store';

/** A CV that plainly evidences every requirement of the frontend role. */
const STRONG_CV = `
  Amara Bello, Frontend Engineer. 7 years building web applications.
  Led the Angular design system at Klarhaus, a token-driven component library
  shared across four product teams. Strong TypeScript throughout. Previously
  React and Storybook. Accessibility lead for the WCAG audit.
`;

/** A real CV for a completely different discipline. */
const UNRELATED_CV = `
  Warehouse operations supervisor. 9 years in logistics and fulfilment.
  Managed a team of 24 across two shifts, owned stock accuracy and forklift
  safety certification. Comfortable with SAP and Excel reporting.
`;

describe('MockAiProvider', () => {
  let provider: AiProvider;
  let prompts: PromptBuilderService;
  let job: Job;

  async function evaluate(resumeText: string): Promise<AiEvaluation> {
    const raw = await provider.complete(prompts.build({ job, resumeText }));
    return parseAiEvaluation(raw, provider.model);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AiProvider, useExisting: MockAiProvider },
      ],
    });

    provider = TestBed.inject(AiProvider);
    prompts = TestBed.inject(PromptBuilderService);
    job = TestBed.inject(JobStore).jobs()[0];
  });

  it('returns JSON that survives validation, within the documented ranges', async () => {
    const evaluation = await evaluate(STRONG_CV);

    expect(evaluation.rating).toBeGreaterThanOrEqual(1);
    expect(evaluation.rating).toBeLessThanOrEqual(5);
    expect(evaluation.matchScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.matchScore).toBeLessThanOrEqual(100);
    expect(evaluation.summary).toContain(job.title);
    expect(evaluation.interviewQuestions.length).toBeGreaterThan(0);
    expect(evaluation.model).toBe('mock-screener-v1');
  });

  // The whole point of the feature: the score comes from the CV text.
  it('scores a matching CV far above an unrelated one for the same job', async () => {
    const strong = await evaluate(STRONG_CV);
    const unrelated = await evaluate(UNRELATED_CV);

    expect(strong.matchScore).toBeGreaterThan(unrelated.matchScore + 30);
    expect(strong.rating).toBeGreaterThan(unrelated.rating);
    expect(strong.recommendedStage).toBe('interview');
    expect(unrelated.recommendedStage).toBe('rejected');
  });

  it('cites the requirements the CV evidences, and flags the ones it does not', async () => {
    const strong = await evaluate(STRONG_CV);
    const unrelated = await evaluate(UNRELATED_CV);

    expect(strong.strengths.length).toBe(job.requirements.length);
    expect(strong.strengths.join(' ')).toContain('Strong TypeScript');

    expect(unrelated.strengths).toEqual([]);
    expect(unrelated.weaknesses.length).toBeGreaterThanOrEqual(job.requirements.length);
    expect(unrelated.missingSkills).toContain('typescript');
  });

  it('reports an unreadable CV rather than inventing a score', async () => {
    const evaluation = await evaluate('');

    expect(evaluation.matchScore).toBe(0);
    expect(evaluation.rating).toBe(1);
    expect(evaluation.summary).toContain('No readable text');
  });

  it('ignores filler words, so "experience" alone never matches a requirement', async () => {
    const evaluation = await evaluate('Many years of strong experience. Excellent skills.');

    expect(evaluation.strengths).toEqual([]);
  });
});
