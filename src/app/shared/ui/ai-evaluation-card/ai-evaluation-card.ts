import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  AiEvaluation,
  AiScreeningState,
  IDLE_SCREENING_STATE,
  PIPELINE_STAGE_LABELS,
  PipelineStage,
} from '@core/models';
import { TimeAgoPipe } from '@shared/pipes/time-ago-pipe';
import { RatingStars } from '@shared/ui/rating-stars/rating-stars';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { pipelineStageTone } from '@shared/ui/status-chip/tone';
import { Tone } from '@shared/ui/status-chip/tone';

/**
 * Presentational view of one AI screening result.
 *
 * Owns no state and injects nothing — the page above it supplies the
 * evaluation and its progress, and handles both outputs.
 */
@Component({
  selector: 'app-ai-evaluation-card',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RatingStars,
    StatusChip,
    TimeAgoPipe,
  ],
  templateUrl: './ai-evaluation-card.html',
  styleUrl: './ai-evaluation-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiEvaluationCard {
  readonly evaluation = input<AiEvaluation | null>(null);
  readonly state = input<AiScreeningState>(IDLE_SCREENING_STATE);

  /** Recruiter asked for a (re-)run. */
  readonly reRun = output<void>();
  /** Recruiter accepted the recommended next stage. */
  readonly stageAccepted = output<PipelineStage>();

  protected readonly busy = computed(() => {
    const phase = this.state().phase;
    return phase === 'parsing' || phase === 'evaluating';
  });

  protected readonly busyLabel = computed(() =>
    this.state().phase === 'parsing' ? 'Reading the CV…' : 'Evaluating against the job…',
  );

  /** A finished run is worth showing even while a re-run is in flight. */
  protected readonly failed = computed(() => this.state().phase === 'failed');

  protected stageLabel(stage: PipelineStage): string {
    return PIPELINE_STAGE_LABELS[stage];
  }

  protected stageTone(stage: PipelineStage): Tone {
    return pipelineStageTone(stage);
  }

  /** Green for a strong match, amber for partial, red for weak. */
  protected scoreTone(matchScore: number): Tone {
    if (matchScore >= 75) return 'success';
    if (matchScore >= 45) return 'warning';
    return 'danger';
  }
}
