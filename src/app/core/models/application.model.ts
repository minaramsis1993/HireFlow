import { AiEvaluation } from './ai-evaluation.model';
import { Candidate } from './candidate.model';
import { Job } from './job.model';
import { ResumeFile } from './resume.model';

/** Ordered pipeline stages. Index order drives the kanban column order. */
export type PipelineStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface Application {
  readonly id: string;
  readonly jobId: string;
  readonly candidateId: string;
  readonly stage: PipelineStage;
  /** 1-5 scorecard rating, or `null` before the first review. */
  readonly rating: number | null;
  readonly appliedAt: string;
  readonly updatedAt: string;
  readonly notes: string;
  /** Written by the candidate at submission; empty when they skipped it. */
  readonly coverLetter: string;
  /** The CV sent with this application, independent of later profile updates. */
  readonly resume: ResumeFile | null;
  /**
   * Text extracted from `resume`. Kept so a recruiter can re-run the screening
   * after a reload, when the uploaded `File` and its object URL are both gone.
   */
  readonly resumeText: string | null;
  /** Latest AI screening verdict, or `null` if the CV was never screened. */
  readonly aiEvaluation: AiEvaluation | null;
}

/** What the apply flow supplies; the store fills in id, stage and timestamps. */
export interface ApplicationDraft {
  readonly jobId: string;
  readonly candidateId: string;
  readonly coverLetter?: string;
  readonly resume?: ResumeFile | null;
}

/** Bounds for the scorecard rating, shared by the store and the star control. */
export const RATING_VALUES: readonly number[] = [1, 2, 3, 4, 5];

/** An application joined with its job and candidate, ready for display. */
export interface ApplicationView extends Application {
  readonly job: Job;
  readonly candidate: Candidate;
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
];

/** Stages a candidate is still actively moving through. */
export const ACTIVE_PIPELINE_STAGES: readonly PipelineStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
];

export const PIPELINE_STAGE_LABELS: Readonly<Record<PipelineStage, string>> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export function isActiveStage(stage: PipelineStage): boolean {
  return ACTIVE_PIPELINE_STAGES.includes(stage);
}
