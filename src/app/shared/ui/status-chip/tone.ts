import { JobStatus, PipelineStage } from '@core/models';

/** Semantic colour buckets shared by every chip/badge in the app. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const JOB_STATUS_TONES: Readonly<Record<JobStatus, Tone>> = {
  draft: 'neutral',
  open: 'success',
  'on-hold': 'warning',
  closed: 'danger',
};

const PIPELINE_STAGE_TONES: Readonly<Record<PipelineStage, Tone>> = {
  applied: 'neutral',
  screening: 'info',
  interview: 'info',
  offer: 'warning',
  hired: 'success',
  rejected: 'danger',
};

export function jobStatusTone(status: JobStatus): Tone {
  return JOB_STATUS_TONES[status];
}

export function pipelineStageTone(stage: PipelineStage): Tone {
  return PIPELINE_STAGE_TONES[stage];
}
