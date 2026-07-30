import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import {
  ApplicationView,
  CANDIDATE_SOURCE_LABELS,
  Candidate,
  candidateFullName,
  candidateInitials,
  PIPELINE_STAGE_LABELS,
} from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { CandidateStore } from '@core/services/candidate-store';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { pipelineStageTone } from '@shared/ui/status-chip/tone';

@Component({
  selector: 'app-candidate-list',
  imports: [
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeader,
    RouterLink,
    StatusChip,
  ],
  templateUrl: './candidate-list.html',
  styleUrl: './candidate-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateList {
  private readonly candidateStore = inject(CandidateStore);
  private readonly applicationStore = inject(ApplicationStore);

  protected readonly search = signal('');
  protected readonly sourceLabels = CANDIDATE_SOURCE_LABELS;
  protected readonly stageLabels = PIPELINE_STAGE_LABELS;
  protected readonly stageTone = pipelineStageTone;
  protected readonly initials = candidateInitials;
  protected readonly fullName = candidateFullName;

  protected readonly results = computed<readonly Candidate[]>(() =>
    this.candidateStore.search(this.search()),
  );

  protected activeApplications(candidateId: string): number {
    return this.applicationStore.forCandidate(candidateId).length;
  }

  /** Most recent submission, so the card says what they are in the running for. */
  protected latestApplication(candidateId: string): ApplicationView | undefined {
    return [...this.applicationStore.forCandidate(candidateId)].sort((a, b) =>
      b.appliedAt.localeCompare(a.appliedAt),
    )[0];
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
