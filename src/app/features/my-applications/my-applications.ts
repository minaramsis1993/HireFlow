import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth-service';
import { ApplicationView, isActiveStage, PIPELINE_STAGE_LABELS } from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { TimeAgoPipe } from '@shared/pipes/time-ago-pipe';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { ResumeChip } from '@shared/ui/resume-chip/resume-chip';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { pipelineStageTone } from '@shared/ui/status-chip/tone';

/**
 * What the candidate submitted and where it stands.
 *
 * Deliberately excludes the recruiter's rating and internal notes — those are
 * hiring-team data that happens to live on the same record.
 */
@Component({
  selector: 'app-my-applications',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    ResumeChip,
    RouterLink,
    StatusChip,
    TimeAgoPipe,
  ],
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyApplications {
  private readonly auth = inject(AuthService);
  private readonly applicationStore = inject(ApplicationStore);

  protected readonly stageLabels = PIPELINE_STAGE_LABELS;
  protected readonly stageTone = pipelineStageTone;

  protected readonly applications = computed<readonly ApplicationView[]>(() => {
    const profile = this.auth.candidateProfile();
    if (!profile) {
      return [];
    }

    return [...this.applicationStore.forCandidate(profile.id)].sort((a, b) =>
      b.appliedAt.localeCompare(a.appliedAt),
    );
  });

  protected readonly activeCount = computed(
    () => this.applications().filter((application) => isActiveStage(application.stage)).length,
  );
}
