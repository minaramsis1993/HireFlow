import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AiEvaluationService } from '@core/ai/ai-evaluation-service';
import { AiPrompt, AiProvider } from '@core/ai/ai-provider';
import {
  ParsedResume,
  ResumeParseError,
  ResumeParserService,
} from '@core/ai/resume-parser-service';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';

const RESUME_TEXT = 'Angular, TypeScript and design systems for seven years.';

/** Stands in for pdfjs so no spec ever loads it. */
class FakeResumeParser {
  text = RESUME_TEXT;
  error: Error | null = null;
  calls = 0;

  async parse(): Promise<ParsedResume> {
    this.calls++;
    if (this.error) {
      throw this.error;
    }
    return { text: this.text, pageCount: 1 };
  }
}

class FakeAiProvider extends AiProvider {
  readonly model = 'fake-model';
  response = JSON.stringify({
    rating: 4,
    matchScore: 82,
    summary: 'Solid overlap with the requirements.',
    strengths: ['Angular'],
    weaknesses: ['No backend work'],
    missingSkills: ['Go'],
    recommendedStage: 'interview',
    interviewQuestions: ['Tell us about your design system.'],
  });
  error: Error | null = null;
  lastPrompt: AiPrompt | null = null;

  async complete(prompt: AiPrompt): Promise<string> {
    this.lastPrompt = prompt;
    if (this.error) {
      throw this.error;
    }
    return this.response;
  }
}

describe('AiEvaluationService', () => {
  let service: AiEvaluationService;
  let applications: ApplicationStore;
  let parser: FakeResumeParser;
  let provider: FakeAiProvider;

  const pdf = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' });

  /** An application with no evaluation yet, so each spec starts clean. */
  function unscreenedApplication() {
    const job = TestBed.inject(JobStore).jobs()[0];
    const application = applications.apply({ jobId: job.id, candidateId: 'cand-1' });
    return { job, application };
  }

  beforeEach(() => {
    parser = new FakeResumeParser();
    provider = new FakeAiProvider();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ResumeParserService, useValue: parser },
        { provide: AiProvider, useValue: provider },
      ],
    });

    service = TestBed.inject(AiEvaluationService);
    applications = TestBed.inject(ApplicationStore);
  });

  it('starts idle for an application it has never seen', () => {
    expect(service.stateFor('app-unknown')).toEqual({ phase: 'idle', error: null });
  });

  it('parses the CV, evaluates it, and saves the result on the application', async () => {
    const { job, application } = unscreenedApplication();

    await service.screen({ applicationId: application.id, job, file: pdf });

    const stored = applications.applications().find((row) => row.id === application.id);
    expect(stored?.aiEvaluation?.matchScore).toBe(82);
    expect(stored?.aiEvaluation?.model).toBe('fake-model');
    expect(stored?.resumeText).toBe(RESUME_TEXT);
    expect(service.stateFor(application.id)).toEqual({ phase: 'ready', error: null });
  });

  it('sends the extracted CV text to the provider', async () => {
    const { job, application } = unscreenedApplication();

    await service.screen({ applicationId: application.id, job, file: pdf });

    expect(provider.lastPrompt?.context.resumeText).toBe(RESUME_TEXT);
    expect(provider.lastPrompt?.user).toContain(RESUME_TEXT);
  });

  // `screen` is started without `await` from the apply flow, so it must never reject.
  it('records a parse failure instead of throwing', async () => {
    const { job, application } = unscreenedApplication();
    parser.error = new ResumeParseError('No selectable text was found.');

    await expectAsync(
      service.screen({ applicationId: application.id, job, file: pdf }),
    ).toBeResolved();

    expect(service.stateFor(application.id)).toEqual({
      phase: 'failed',
      error: 'No selectable text was found.',
    });
    expect(applications.applications().find((row) => row.id === application.id)?.aiEvaluation).toBe(
      null,
    );
  });

  it('records a provider failure instead of throwing', async () => {
    const { job, application } = unscreenedApplication();
    provider.error = new Error('The model is unavailable.');

    await service.screen({ applicationId: application.id, job, file: pdf });

    expect(service.stateFor(application.id).phase).toBe('failed');
    expect(service.stateFor(application.id).error).toBe('The model is unavailable.');
  });

  it('records unusable provider output instead of throwing', async () => {
    const { job, application } = unscreenedApplication();
    provider.response = 'I cannot help with that.';

    await service.screen({ applicationId: application.id, job, file: pdf });

    expect(service.stateFor(application.id).phase).toBe('failed');
    expect(service.stateFor(application.id).error).toContain('not valid JSON');
  });

  // The re-run path after a reload: the File is gone, the stored text is not.
  it('re-evaluates from the stored CV text without touching the parser', async () => {
    const { job, application } = unscreenedApplication();
    await service.screen({ applicationId: application.id, job, file: pdf });

    const callsAfterScreen = parser.calls;
    provider.response = JSON.stringify({
      rating: 2,
      matchScore: 35,
      summary: 'Reconsidered on a second pass.',
      recommendedStage: 'screening',
    });

    await service.reEvaluate(application.id);

    expect(parser.calls).toBe(callsAfterScreen);
    const stored = applications.applications().find((row) => row.id === application.id);
    expect(stored?.aiEvaluation?.matchScore).toBe(35);
    expect(service.stateFor(application.id).phase).toBe('ready');
  });

  it('explains itself when there is no stored CV text to re-run from', async () => {
    const { application } = unscreenedApplication();

    await service.reEvaluate(application.id);

    expect(service.stateFor(application.id).phase).toBe('failed');
    expect(service.stateFor(application.id).error).toContain('No CV text is stored');
  });

  it('fails cleanly for an application that no longer exists', async () => {
    await service.reEvaluate('app-does-not-exist');

    expect(service.stateFor('app-does-not-exist').error).toContain('no longer available');
  });

  it('tracks each application separately', async () => {
    const { job, application } = unscreenedApplication();
    const other = applications.apply({ jobId: job.id, candidateId: 'cand-2' });

    await service.screen({ applicationId: application.id, job, file: pdf });

    expect(service.stateFor(application.id).phase).toBe('ready');
    expect(service.stateFor(other.id).phase).toBe('idle');
  });
});
