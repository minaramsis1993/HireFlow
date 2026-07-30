import { computed, Injectable, signal } from '@angular/core';

import { SEED_CANDIDATES } from '@core/data/seed-data';
import { Candidate, CandidateDraft, candidateFullName, splitFullName, User } from '@core/models';
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

  /** The talent-pool profile behind a candidate account. */
  byUserId(userId: string): Candidate | undefined {
    return this.state().find((candidate) => candidate.userId === userId);
  }

  /**
   * Guarantees a signed-in candidate has a profile, so their applications land
   * in the recruiter's talent pool. An existing record with the same email is
   * claimed rather than duplicated — that is the sourced-then-signed-up case.
   */
  ensureProfileForUser(user: User): Candidate {
    const linked = this.byUserId(user.id);
    if (linked) {
      return linked;
    }

    const byEmail = this.state().find((candidate) => candidate.email === user.email);
    if (byEmail) {
      this.update(byEmail.id, { userId: user.id });
      return { ...byEmail, userId: user.id };
    }

    const { firstName, lastName } = splitFullName(user.fullName);
    return this.add({
      userId: user.id,
      firstName,
      lastName,
      email: user.email,
      phone: '',
      location: '',
      headline: 'New applicant',
      yearsOfExperience: 0,
      source: 'careers-site',
      skills: [],
      resume: null,
    });
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
