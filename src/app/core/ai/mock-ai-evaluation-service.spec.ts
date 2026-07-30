import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AiEvaluationService } from '@core/ai/ai-evaluation-service';
import { MockAiEvaluationService } from '@core/ai/mock-ai-evaluation-service';
import { CandidateStore } from '@core/services/candidate-store';
import { JobStore } from '@core/services/job-store';

describe('MockAiEvaluationService', () => {
  let service: AiEvaluationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AiEvaluationService, useExisting: MockAiEvaluationService },
      ],
    });
    service = TestBed.inject(AiEvaluationService);
  });

  it('returns a score and a rating inside the documented ranges', async () => {
    const job = TestBed.inject(JobStore).jobs()[0];
    const candidate = TestBed.inject(CandidateStore).candidates()[0];

    const evaluation = await service.evaluate({ job, candidate, resumeText: 'placeholder' });

    expect(evaluation.matchScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.matchScore).toBeLessThanOrEqual(100);
    expect(evaluation.suggestedRating).toBeGreaterThanOrEqual(1);
    expect(evaluation.suggestedRating).toBeLessThanOrEqual(5);
    expect(evaluation.summary).toContain(job.title);
    expect(evaluation.interviewQuestions.length).toBeGreaterThan(0);
  });

  it('describes the CV it was handed', async () => {
    const extraction = await service.extractResumeText({
      name: 'amara-bello.pdf',
      sizeBytes: 2048,
      mimeType: 'application/pdf',
      uploadedAt: new Date().toISOString(),
      url: null,
    });

    expect(extraction.text).toContain('amara-bello.pdf');
  });
});
