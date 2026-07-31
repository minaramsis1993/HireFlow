import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Job, RESUME_TEXT_LIMIT } from '@core/models';
import { PromptBuilderService } from '@core/ai/prompt-builder-service';
import { JobStore } from '@core/services/job-store';

describe('PromptBuilderService', () => {
  let builder: PromptBuilderService;
  let job: Job;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    builder = TestBed.inject(PromptBuilderService);
    job = TestBed.inject(JobStore).jobs()[0];
  });

  it('puts the job, its requirements and the CV text into the user prompt', () => {
    const prompt = builder.build({ job, resumeText: 'Angular and TypeScript for seven years.' });

    expect(prompt.user).toContain(job.title);
    expect(prompt.user).toContain(job.description);
    expect(prompt.user).toContain('Angular and TypeScript for seven years.');

    for (const requirement of job.requirements) {
      expect(prompt.user).toContain(requirement);
    }
  });

  it('pins the response format and the allowed stages in the system prompt', () => {
    const prompt = builder.build({ job, resumeText: 'anything' });

    expect(prompt.system).toContain('JSON');
    expect(prompt.system).toContain('"matchScore"');
    expect(prompt.system).toContain('"missingSkills"');
    expect(prompt.system).toContain('"screening"');
    expect(prompt.system).toContain('"interview"');
  });

  it('carries the structured context through for schema-aware providers', () => {
    const prompt = builder.build({ job, resumeText: 'cv text' });

    expect(prompt.context.job).toBe(job);
    expect(prompt.context.resumeText).toBe('cv text');
  });

  it('truncates an oversized CV and says so', () => {
    const prompt = builder.build({ job, resumeText: 'x'.repeat(RESUME_TEXT_LIMIT + 500) });

    expect(prompt.user).toContain('truncated');
    expect(prompt.user.length).toBeLessThan(RESUME_TEXT_LIMIT + 1000);
  });

  it('is deterministic, so provider behaviour stays comparable', () => {
    const first = builder.build({ job, resumeText: 'same input' });
    const second = builder.build({ job, resumeText: 'same input' });

    expect(first.system).toBe(second.system);
    expect(first.user).toBe(second.user);
  });

  it('handles a job with no listed requirements', () => {
    const prompt = builder.build({ job: { ...job, requirements: [] }, resumeText: 'cv' });

    expect(prompt.user).toContain('None specified');
  });
});
