/**
 * Who is using the app. Recruiters get the ATS; candidates get the job board
 * and their own applications.
 */
export type UserRole = 'recruiter' | 'candidate';

export interface User {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: string;
}

/** Shape accepted by `AuthService.login`. */
export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/** Shape accepted by `AuthService.register`. */
export interface RegisterRequest extends Credentials {
  readonly fullName: string;
  readonly role: UserRole;
}

/**
 * A user plus the password typed at registration.
 *
 * Mock authentication only — a real backend hashes credentials server-side and
 * never ships them to the browser. This type exists so the fake directory in
 * `localStorage` has a name, and disappears with the first real `/auth` call.
 */
export interface Account {
  readonly user: User;
  readonly password: string;
}

export const USER_ROLES: readonly UserRole[] = ['recruiter', 'candidate'];

export const USER_ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  recruiter: 'Recruiter',
  candidate: 'Candidate',
};

export const USER_ROLE_DESCRIPTIONS: Readonly<Record<UserRole, string>> = {
  recruiter: 'Post jobs, review applicants and run the hiring pipeline.',
  candidate: 'Browse open roles, apply with your CV and track your applications.',
};

/** Where each role lands after signing in. */
export const ROLE_HOME_ROUTE: Readonly<Record<UserRole, string>> = {
  recruiter: '/dashboard',
  candidate: '/jobs',
};

export function userInitials(user: User): string {
  const [first = '', second = ''] = user.fullName.trim().split(/\s+/);
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase() || first.charAt(0).toUpperCase();
}

/** Splits a display name into the first/last pair the candidate record stores. */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}
