import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiEvaluation } from '@core/models';
import { AiEvaluationCard } from './ai-evaluation-card';

const EVALUATION: AiEvaluation = {
  rating: 4,
  matchScore: 87,
  summary: 'Covers the core requirements with real depth.',
  strengths: ['Strong TypeScript — CV mentions typescript.'],
  weaknesses: ['No evidence of backend work in the CV.'],
  missingSkills: ['AWS', 'GraphQL'],
  recommendedStage: 'interview',
  interviewQuestions: ['Walk us through your design system work.'],
  model: 'mock-screener-v1',
  generatedAt: '2026-07-30T09:00:00.000Z',
};

describe('AiEvaluationCard', () => {
  let fixture: ComponentFixture<AiEvaluationCard>;

  const text = () => fixture.nativeElement.textContent as string;
  const button = (label: string): HTMLButtonElement | undefined =>
    [...fixture.nativeElement.querySelectorAll('button')].find((element) =>
      (element as HTMLButtonElement).textContent?.includes(label),
    ) as HTMLButtonElement | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiEvaluationCard],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AiEvaluationCard);
  });

  it('renders every section of a finished evaluation', async () => {
    fixture.componentRef.setInput('evaluation', EVALUATION);
    await fixture.whenStable();

    expect(text()).toContain('AI Evaluation');
    expect(text()).toContain('87%');
    expect(text()).toContain(EVALUATION.summary);
    expect(text()).toContain('Strong TypeScript');
    expect(text()).toContain('No evidence of backend work');
    expect(text()).toContain('AWS');
    expect(text()).toContain('GraphQL');
    expect(text()).toContain('Interview');
    expect(text()).toContain('Walk us through your design system work.');
    expect(text()).toContain('mock-screener-v1');
  });

  it('shows the rating as stars rather than a number', async () => {
    fixture.componentRef.setInput('evaluation', EVALUATION);
    await fixture.whenStable();

    const stars = fixture.nativeElement.querySelectorAll('app-rating-stars mat-icon');
    expect(stars.length).toBe(5);
    expect(
      [...stars].filter((icon) => (icon as HTMLElement).textContent?.trim() === 'star').length,
    ).toBe(4);
  });

  it('invites a first run when nothing has been screened', async () => {
    await fixture.whenStable();

    expect(text()).toContain('has not been screened yet');
    expect(button('Evaluate with AI')).toBeTruthy();
  });

  it('shows progress while the CV is being read and evaluated', async () => {
    fixture.componentRef.setInput('state', { phase: 'parsing', error: null });
    await fixture.whenStable();
    expect(text()).toContain('Reading the CV');

    fixture.componentRef.setInput('state', { phase: 'evaluating', error: null });
    await fixture.whenStable();
    expect(text()).toContain('Evaluating against the job');

    // No re-run button competes with an in-flight run.
    expect(button('Re-run')).toBeFalsy();
  });

  it('surfaces a failure with a way to retry', async () => {
    fixture.componentRef.setInput('state', { phase: 'failed', error: 'The CV could not be read.' });
    await fixture.whenStable();

    expect(text()).toContain('The CV could not be read.');
    expect(button('Evaluate with AI')).toBeTruthy();
  });

  it('keeps the previous result visible while a re-run is failing', async () => {
    fixture.componentRef.setInput('evaluation', EVALUATION);
    fixture.componentRef.setInput('state', { phase: 'failed', error: 'The model is unavailable.' });
    await fixture.whenStable();

    expect(text()).toContain('The model is unavailable.');
    expect(text()).toContain('87%');
  });

  it('emits when the recruiter asks for a re-run', async () => {
    const runs: void[] = [];
    fixture.componentRef.setInput('evaluation', EVALUATION);
    fixture.componentInstance.reRun.subscribe(() => runs.push(undefined));
    await fixture.whenStable();

    button('Re-run')?.click();

    expect(runs.length).toBe(1);
  });

  it('emits the recommended stage when the recruiter accepts it', async () => {
    const stages: string[] = [];
    fixture.componentRef.setInput('evaluation', EVALUATION);
    fixture.componentInstance.stageAccepted.subscribe((stage) => stages.push(stage));
    await fixture.whenStable();

    button('Move to Interview')?.click();

    expect(stages).toEqual(['interview']);
  });
});
