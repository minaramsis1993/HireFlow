import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import {
  CANDIDATE_SOURCE_LABELS,
  CANDIDATE_SOURCES,
  candidateFullName,
  isActiveStage,
  PIPELINE_STAGE_LABELS,
  PipelineStage,
} from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { CandidateStore } from '@core/services/candidate-store';
import { JobStore } from '@core/services/job-store';
import { TimeAgoPipe } from '@shared/pipes/time-ago-pipe';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { StatCard } from '@shared/ui/stat-card/stat-card';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { pipelineStageTone } from '@shared/ui/status-chip/tone';

interface FunnelRow {
  readonly stage: PipelineStage;
  readonly label: string;
  readonly count: number;
  /** Width of the bar as a percentage of the largest stage. */
  readonly share: number;
}

const FUNNEL_STAGES: readonly PipelineStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
];

@Component({
  selector: 'app-dashboard',
  imports: [
    EmptyState,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    RouterLink,
    StatCard,
    StatusChip,
    TimeAgoPipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly jobStore = inject(JobStore);
  private readonly candidateStore = inject(CandidateStore);
  private readonly applicationStore = inject(ApplicationStore);

  protected readonly openJobCount = computed(() => this.jobStore.openJobs().length);
  protected readonly candidateCount = computed(() => this.candidateStore.candidates().length);
  protected readonly activeCount = this.applicationStore.activeCount;
  protected readonly hiredCount = this.applicationStore.hiredCount;
  protected readonly recent = this.applicationStore.recent;

  protected readonly funnel = computed<readonly FunnelRow[]>(() => {
    const buckets = this.applicationStore.byStage();
    const counts = FUNNEL_STAGES.map(
      (stage) => buckets.find((bucket) => bucket.stage === stage)?.applications.length ?? 0,
    );
    const peak = Math.max(...counts, 1);

    return FUNNEL_STAGES.map((stage, index) => ({
      stage,
      label: PIPELINE_STAGE_LABELS[stage],
      count: counts[index],
      share: Math.round((counts[index] / peak) * 100),
    }));
  });

  /** Rows shown in each stat card's hover panel, capped at `maxRows`. */
  protected readonly maxRows = 5;

  protected readonly openRoleRows = computed(() =>
    this.jobStore.openJobs().map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department,
      applicants: this.applicationStore.forJob(job.id).length,
    })),
  );

  protected readonly candidateSourceRows = computed(() => {
    const candidates = this.candidateStore.candidates();

    return CANDIDATE_SOURCES.map((source) => ({
      source,
      label: CANDIDATE_SOURCE_LABELS[source],
      count: candidates.filter((candidate) => candidate.source === source).length,
    }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  /** Active candidates grouped by requisition — the funnel already covers stages. */
  protected readonly activeByJobRows = computed(() => {
    const counts = new Map<string, { id: string; title: string; count: number }>();

    for (const view of this.applicationStore.views()) {
      if (!isActiveStage(view.stage)) {
        continue;
      }

      const row = counts.get(view.jobId) ?? { id: view.jobId, title: view.job.title, count: 0 };
      counts.set(view.jobId, { ...row, count: row.count + 1 });
    }

    return [...counts.values()].sort((a, b) => b.count - a.count);
  });

  protected readonly hiredRows = computed(() =>
    this.applicationStore
      .views()
      .filter((view) => view.stage === 'hired')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  protected readonly stageLabel = (stage: PipelineStage): string => PIPELINE_STAGE_LABELS[stage];
  protected readonly stageTone = pipelineStageTone;
  protected readonly fullName = candidateFullName;
}
