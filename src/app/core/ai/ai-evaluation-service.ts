import { Candidate, Job, ResumeFile } from '@core/models';

/** Structured result of reading a CV. */
export interface ResumeExtraction {
  readonly text: string;
  readonly skills: readonly string[];
  readonly yearsOfExperience: number | null;
}

export interface AiEvaluationRequest {
  readonly job: Job;
  readonly candidate: Candidate;
  /** Output of `extractResumeText`, so the two steps can run at different times. */
  readonly resumeText: string;
}

export interface AiEvaluation {
  readonly summary: string;
  /** 0-100 fit against the job description. */
  readonly matchScore: number;
  /** 1-5, on the same scale as the recruiter scorecard. */
  readonly suggestedRating: number;
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly interviewQuestions: readonly string[];
  readonly model: string;
  readonly generatedAt: string;
}

/**
 * Contract for the screening pipeline:
 *
 * ```
 * upload CV → extract text → compare with the job description
 *   → summary + match score + suggested rating + interview questions
 * ```
 *
 * Injected as an abstract class so it doubles as the DI token. The app provides
 * `MockAiEvaluationService`; pointing that provider at an HTTP-backed
 * implementation is the whole of the future integration work — no component
 * needs to change, because the return shapes are already fixed here.
 *
 * Nothing calls this yet: AI is deliberately out of scope for this release.
 */
export abstract class AiEvaluationService {
  abstract extractResumeText(resume: ResumeFile): Promise<ResumeExtraction>;

  abstract evaluate(request: AiEvaluationRequest): Promise<AiEvaluation>;
}
