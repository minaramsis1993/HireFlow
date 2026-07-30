import { computed, Injectable, signal } from '@angular/core';

import { SEED_CANDIDATES } from '@core/data/seed-data';
import { Candidate, CandidateDraft, candidateFullName } from '@core/models';
import { createId } from '@core/utils/id';

@Injectable({ providedIn: 'root' })
export class CandidateStore {
  private readonly state = signal<readonly Candidate[]>(SEED_CANDIDATES);

  readonly candidates = this.state.asReadonly();

  readonly skills = computed(() =>
    [...new Set(this.state().flatMap((candidate) => candidate.skills))].sort(),
  );

  byId(id: string): Candidate | undefined {
    return this.state().find((candidate) => candidate.id === id);
  }

  /** Case-insensitive match across name, headline, email and skills. */
  search(term: string): readonly Candidate[] {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      return this.state();
    }

    return this.state().filter((candidate) =>
      [
        candidateFullName(candidate),
        candidate.headline,
        candidate.email,
        candidate.location,
        ...candidate.skills,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  add(draft: CandidateDraft): Candidate {
    const candidate: Candidate = {
      ...draft,
      id: createId('cand'),
      createdAt: new Date().toISOString(),
    };
    this.state.update((candidates) => [candidate, ...candidates]);
    return candidate;
  }

  update(id: string, changes: Partial<CandidateDraft>): void {
    this.state.update((candidates) =>
      candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, ...changes } : candidate,
      ),
    );
  }

  remove(id: string): void {
    this.state.update((candidates) => candidates.filter((candidate) => candidate.id !== id));
  }
}
