import { Candidate } from './candidate.model';
import { Job } from './job.model';

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
}

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
