import { PIPELINE_STAGES, PipelineStage } from './application.model';

/**
 * Screening verdict for one application, produced from the text extracted out
 * of the candidate's CV.
 *
 * Every field here is what a provider is asked to return, so the shape is the
 * contract between `PromptBuilderService` and whichever `AiProvider` is wired
 * up — mock today, a real model later.
 */
export interface AiEvaluation {
  /** 1-5, the same scale as the recruiter scorecard. */
  readonly rating: number;
  /** 0-100 fit against the job description. */
  readonly matchScore: number;
  readonly summary: string;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly missingSkills: readonly string[];
  /** Typed to the app's own pipeline so the card can offer to move the candidate. */
  readonly recommendedStage: PipelineStage;
  readonly interviewQuestions: readonly string[];
  /** Which model produced this, and when. */
  readonly model: string;
  readonly generatedAt: string;
}

export type AiScreeningPhase = 'idle' | 'parsing' | 'evaluating' | 'ready' | 'failed';

/** Transient progress for one application; owned by `AiEvaluationService`. */
export interface AiScreeningState {
  readonly phase: AiScreeningPhase;
  readonly error: string | null;
}

export const IDLE_SCREENING_STATE: AiScreeningState = { phase: 'idle', error: null };

/** Longest CV text handed to a provider, so real context limits are respected. */
export const RESUME_TEXT_LIMIT = 12_000;

/** Thrown when a provider returns something that isn't a usable evaluation. */
export class AiEvaluationFormatError extends Error {
  constructor(reason: string) {
    super(`The AI response could not be read: ${reason}`);
    this.name = 'AiEvaluationFormatError';
  }
}

/**
 * Turns raw provider output into a trusted `AiEvaluation`.
 *
 * Models return text, and they lie about their own schema — they wrap JSON in
 * fences, invent stage names and drift out of the stated ranges. Validating in
 * one place means every provider gets the same guarantees and the UI never has
 * to defend itself.
 */
export function parseAiEvaluation(raw: string, model: string): AiEvaluation {
  const payload = extractJsonObject(raw);

  const summary = typeof payload['summary'] === 'string' ? payload['summary'].trim() : '';
  if (!summary) {
    throw new AiEvaluationFormatError('no summary was returned');
  }

  return {
    rating: clamp(toNumber(payload['rating'], 3), 1, 5),
    matchScore: clamp(toNumber(payload['matchScore'], 0), 0, 100),
    summary,
    strengths: toStringArray(payload['strengths']),
    weaknesses: toStringArray(payload['weaknesses']),
    missingSkills: toStringArray(payload['missingSkills']),
    recommendedStage: toStage(payload['recommendedStage']),
    interviewQuestions: toStringArray(payload['interviewQuestions']),
    model,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Pulls the JSON object out of raw model output, or throws.
 *
 * Exported because a provider that retries on unusable output has to ask
 * exactly the question `parseAiEvaluation` will ask — a looser check retries
 * responses that would have parsed, a stricter one gives up on ones that would.
 */
export function extractJsonObject(raw: string): Record<string, unknown> {
  // Models habitually wrap JSON in ```json fences despite being told not to.
  const unfenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  // Fall back to the outermost braces when a model adds a sentence around it.
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new AiEvaluationFormatError('the response was not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new AiEvaluationFormatError('the response was not a JSON object');
  }

  return parsed as Record<string, unknown>;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Maps whatever the model called the next step onto a real pipeline stage.
 * Prompts ask for the literals, but "Phone Screen" is the kind of thing that
 * comes back anyway — anything unrecognised lands on `screening`.
 */
function toStage(value: unknown): PipelineStage {
  if (typeof value !== 'string') {
    return 'screening';
  }

  const normalized = value.trim().toLowerCase();
  const exact = PIPELINE_STAGES.find((stage) => stage === normalized);
  if (exact) {
    return exact;
  }

  if (normalized.includes('reject') || normalized.includes('decline')) {
    return 'rejected';
  }
  if (normalized.includes('offer')) {
    return 'offer';
  }
  if (normalized.includes('interview') || normalized.includes('onsite')) {
    return 'interview';
  }

  return 'screening';
}
