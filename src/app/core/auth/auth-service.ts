import { computed, inject, Injectable, signal } from '@angular/core';

import { SEED_ACCOUNTS } from '@core/data/seed-data';
import {
  Account,
  Credentials,
  RegisterRequest,
  ROLE_HOME_ROUTE,
  User,
  UserRole,
} from '@core/models';
import { CandidateStore } from '@core/services/candidate-store';
import { createId } from '@core/utils/id';
import { readJson, removeKey, writeJson } from '@core/utils/storage';

const ACCOUNTS_KEY = 'hireflow.auth.accounts';
const SESSION_KEY = 'hireflow.auth.session';

export type AuthResult =
  { readonly ok: true; readonly user: User } | { readonly ok: false; readonly error: string };

/** A seeded sign-in offered as a one-click fill while there is no backend. */
export interface DemoLogin extends Credentials {
  readonly fullName: string;
  readonly role: UserRole;
}

/**
 * Mock authentication backed by `localStorage`.
 *
 * The account directory and the signed-in user id are the only things this app
 * persists; everything else still comes from the seed fixtures. `login` and
 * `register` are async so swapping the two lookups below for `POST /auth/*`
 * calls does not ripple into any component.
 *
 * Signing in as a candidate guarantees a matching `Candidate` record exists, so
 * anything they apply to shows up in the recruiter's talent pool immediately.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly candidateStore = inject(CandidateStore);

  private readonly accountState = signal<readonly Account[]>(
    readJson<readonly Account[]>(ACCOUNTS_KEY, SEED_ACCOUNTS),
  );

  private readonly sessionState = signal<User | null>(null);

  readonly user = this.sessionState.asReadonly();

  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  readonly role = computed<UserRole | null>(() => this.sessionState()?.role ?? null);

  readonly isRecruiter = computed(() => this.role() === 'recruiter');

  readonly isCandidate = computed(() => this.role() === 'candidate');

  /** Landing route for the signed-in role; the sign-in page when there is none. */
  readonly homeRoute = computed(() => {
    const role = this.role();
    return role ? ROLE_HOME_ROUTE[role] : '/login';
  });

  /** Demo credentials surfaced on the sign-in page. Drops out with the mock. */
  readonly demoLogins: readonly DemoLogin[] = SEED_ACCOUNTS.map(({ user, password }) => ({
    fullName: user.fullName,
    email: user.email,
    password,
    role: user.role,
  }));

  /** The talent-pool profile of the signed-in candidate, if any. */
  readonly candidateProfile = computed(() => {
    const user = this.sessionState();
    return user?.role === 'candidate' ? this.candidateStore.byUserId(user.id) : undefined;
  });

  constructor() {
    const storedId = readJson<string | null>(SESSION_KEY, null);
    const restored = storedId ? this.findById(storedId) : undefined;
    if (restored) {
      this.startSession(restored);
    } else if (storedId) {
      removeKey(SESSION_KEY);
    }
  }

  async login(credentials: Credentials): Promise<AuthResult> {
    const email = normalizeEmail(credentials.email);
    const account = this.accountState().find((entry) => entry.user.email === email);

    if (!account || account.password !== credentials.password) {
      return { ok: false, error: 'That email and password combination is not recognised.' };
    }

    this.startSession(account.user);
    return { ok: true, user: account.user };
  }

  async register(request: RegisterRequest): Promise<AuthResult> {
    const email = normalizeEmail(request.email);

    if (this.accountState().some((entry) => entry.user.email === email)) {
      return { ok: false, error: 'An account already exists for that email.' };
    }

    const user: User = {
      id: createId('user'),
      fullName: request.fullName.trim(),
      email,
      role: request.role,
      createdAt: new Date().toISOString(),
    };

    this.accountState.update((accounts) => [...accounts, { user, password: request.password }]);
    writeJson(ACCOUNTS_KEY, this.accountState());

    this.startSession(user);
    return { ok: true, user };
  }

  logout(): void {
    this.sessionState.set(null);
    removeKey(SESSION_KEY);
  }

  private startSession(user: User): void {
    if (user.role === 'candidate') {
      this.candidateStore.ensureProfileForUser(user);
    }

    this.sessionState.set(user);
    writeJson(SESSION_KEY, user.id);
  }

  private findById(id: string): User | undefined {
    return this.accountState().find((entry) => entry.user.id === id)?.user;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
