import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AiProvider } from '@core/ai/ai-provider';
import { ApplicationStore } from '@core/services/application-store';
import { CandidateStore } from '@core/services/candidate-store';
import { CandidateDetail } from './candidate-detail';

/** Resolves immediately, so a re-run finishes inside `whenStable`. */
class InstantAiProvider extends AiProvider {
  readonly model = 'instant-test-model';

  async complete(): Promise<string> {
    return JSON.stringify({
      rating: 2,
      matchScore: 41,
      summary: 'Reconsidered on a second pass.',
      strengths: [],
      weaknesses: ['Thin evidence for the core requirements.'],
      missingSkills: ['Kubernetes'],
      recommendedStage: 'screening',
      interviewQuestions: ['What would you want to learn first?'],
    });
  }
}

describe('CandidateDetail', () => {
  let fixture: ComponentFixture<CandidateDetail>;
  let applications: ApplicationStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AiProvider, useClass: InstantAiProvider },
      ],
    }).compileComponents();

    applications = TestBed.inject(ApplicationStore);
    fixture = TestBed.createComponent(CandidateDetail);
  });

  async function showCandidate(id: string): Promise<void> {
    fixture.componentRef.setInput('id', id);
    await fixture.whenStable();
  }

  it('renders the profile for the routed id', async () => {
    const candidate = TestBed.inject(CandidateStore).candidates()[0];
    await showCandidate(candidate.id);

    expect(fixture.nativeElement.textContent).toContain(candidate.firstName);
    expect(fixture.nativeElement.textContent).toContain(candidate.email);
  });

  it('falls back to an empty state for an unknown id', async () => {
    await showCandidate('cand-does-not-exist');

    expect(fixture.nativeElement.textContent).toContain('Candidate not found');
  });

  it('shows a seeded AI evaluation inside the application it belongs to', async () => {
    const screened = applications.applications().find((row) => row.aiEvaluation);
    expect(screened).toBeDefined();

    await showCandidate(screened!.candidateId);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('AI Evaluation');
    expect(text).toContain(`${screened!.aiEvaluation!.matchScore}%`);
    expect(text).toContain(screened!.aiEvaluation!.summary);
    expect(text).toContain('Suggested interview questions');
  });

  it('offers a first run for an application that was never screened', async () => {
    const unscreened = applications
      .applications()
      .find((row) => !row.aiEvaluation && applications.forCandidate(row.candidateId).length === 1);
    expect(unscreened).toBeDefined();

    await showCandidate(unscreened!.candidateId);

    expect(fixture.nativeElement.textContent).toContain('has not been screened yet');
  });

  it('re-runs the evaluation from the stored CV text', async () => {
    const screened = applications.applications().find((row) => row.resumeText);
    expect(screened).toBeDefined();

    await showCandidate(screened!.candidateId);

    const rerun = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Re-run'),
    ) as HTMLButtonElement;
    expect(rerun).toBeDefined();

    rerun.click();
    await fixture.whenStable();

    const updated = applications.applications().find((row) => row.id === screened!.id);
    expect(updated!.aiEvaluation!.model).toBe('instant-test-model');
    expect(updated!.aiEvaluation!.matchScore).toBe(41);
    // Re-run reads the stored text, so the CV never had to be parsed again.
    expect(updated!.resumeText).toBe(screened!.resumeText);
    expect(fixture.nativeElement.textContent).toContain('41%');
  });
});
