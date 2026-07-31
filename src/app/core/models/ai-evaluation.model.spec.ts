import { AiEvaluationFormatError, parseAiEvaluation } from './ai-evaluation.model';

/** Everything a well-behaved provider returns. */
const VALID = JSON.stringify({
  rating: 4,
  matchScore: 87,
  summary: 'Strong overlap with the core requirements.',
  strengths: ['Deep Angular experience'],
  weaknesses: ['No backend exposure'],
  missingSkills: ['AWS', 'GraphQL'],
  recommendedStage: 'interview',
  interviewQuestions: ['Walk through your design system work.'],
});

describe('parseAiEvaluation', () => {
  it('reads a well-formed response', () => {
    const evaluation = parseAiEvaluation(VALID, 'test-model');

    expect(evaluation.rating).toBe(4);
    expect(evaluation.matchScore).toBe(87);
    expect(evaluation.missingSkills).toEqual(['AWS', 'GraphQL']);
    expect(evaluation.recommendedStage).toBe('interview');
    expect(evaluation.model).toBe('test-model');
    expect(evaluation.generatedAt).toBeTruthy();
  });

  it('unwraps a fenced code block', () => {
    expect(parseAiEvaluation('```json\n' + VALID + '\n```', 'm').matchScore).toBe(87);
  });

  it("recovers JSON wrapped in the model's own commentary", () => {
    const chatty = `Sure! Here is the evaluation:\n${VALID}\nLet me know if you need more.`;

    expect(parseAiEvaluation(chatty, 'm').rating).toBe(4);
  });

  it('clamps values that drift outside the documented ranges', () => {
    const drifted = JSON.stringify({
      rating: 9,
      matchScore: 143,
      summary: 'Over-enthusiastic.',
      recommendedStage: 'interview',
    });

    const evaluation = parseAiEvaluation(drifted, 'm');

    expect(evaluation.rating).toBe(5);
    expect(evaluation.matchScore).toBe(100);
  });

  it('maps an invented stage name onto a real pipeline stage', () => {
    const stageOf = (recommendedStage: string) =>
      parseAiEvaluation(JSON.stringify({ summary: 's', recommendedStage }), 'm').recommendedStage;

    expect(stageOf('Phone Screen')).toBe('screening');
    expect(stageOf('Onsite Loop')).toBe('interview');
    expect(stageOf('Do not proceed — reject')).toBe('rejected');
    expect(stageOf('something else entirely')).toBe('screening');
  });

  it('defaults the list fields rather than trusting their shape', () => {
    const messy = JSON.stringify({
      summary: 'ok',
      strengths: 'not an array',
      weaknesses: ['real', 42, '  ', ' padded '],
      recommendedStage: 'screening',
    });

    const evaluation = parseAiEvaluation(messy, 'm');

    expect(evaluation.strengths).toEqual([]);
    expect(evaluation.weaknesses).toEqual(['real', 'padded']);
    expect(evaluation.missingSkills).toEqual([]);
  });

  it('rejects output that is not usable at all', () => {
    expect(() => parseAiEvaluation('I cannot help with that.', 'm')).toThrowError(
      AiEvaluationFormatError,
    );
    expect(() => parseAiEvaluation('[1, 2, 3]', 'm')).toThrowError(AiEvaluationFormatError);
    expect(() => parseAiEvaluation(JSON.stringify({ rating: 4 }), 'm')).toThrowError(
      AiEvaluationFormatError,
    );
  });
});
