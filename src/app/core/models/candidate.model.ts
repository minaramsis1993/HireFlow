import { ResumeFile } from './resume.model';

export type CandidateSource = 'careers-site' | 'referral' | 'sourced' | 'agency' | 'job-board';

/**
 * A person in the talent pool — and, when `userId` is set, the profile behind a
 * candidate account. Recruiter-sourced people have no account and keep `null`.
 */
export interface Candidate {
  readonly id: string;
  /** The `User` this profile belongs to, or `null` for sourced candidates. */
  readonly userId: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly location: string;
  /** Short professional summary shown under the candidate name. */
  readonly headline: string;
  readonly yearsOfExperience: number;
  readonly source: CandidateSource;
  readonly skills: readonly string[];
  /** Latest CV on the profile. Each application also keeps the one it was sent with. */
  readonly resume: ResumeFile | null;
  readonly createdAt: string;
}

export type CandidateDraft = Omit<Candidate, 'id' | 'createdAt'>;

export const CANDIDATE_SOURCES: readonly CandidateSource[] = [
  'careers-site',
  'referral',
  'sourced',
  'agency',
  'job-board',
];

export const CANDIDATE_SOURCE_LABELS: Readonly<Record<CandidateSource, string>> = {
  'careers-site': 'Careers site',
  referral: 'Referral',
  sourced: 'Sourced',
  agency: 'Agency',
  'job-board': 'Job board',
};

export function candidateFullName(candidate: Candidate): string {
  return `${candidate.firstName} ${candidate.lastName}`;
}

export function candidateInitials(candidate: Candidate): string {
  return `${candidate.firstName.charAt(0)}${candidate.lastName.charAt(0)}`.toUpperCase();
}
