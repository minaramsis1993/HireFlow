/** Lifecycle of a requisition. Only `open` jobs accept new applications. */
export type JobStatus = 'draft' | 'open' | 'on-hold' | 'closed';

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';

export type WorkMode = 'on-site' | 'hybrid' | 'remote';

export interface SalaryRange {
  readonly min: number;
  readonly max: number;
  readonly currency: string;
}

export interface Job {
  readonly id: string;
  readonly title: string;
  readonly department: string;
  readonly location: string;
  readonly workMode: WorkMode;
  readonly employmentType: EmploymentType;
  readonly status: JobStatus;
  readonly openings: number;
  readonly salary: SalaryRange;
  readonly description: string;
  readonly requirements: readonly string[];
  readonly hiringManager: string;
  readonly createdAt: string;
}

/** Shape accepted when creating a requisition; the store assigns `id` and `createdAt`. */
export type JobDraft = Omit<Job, 'id' | 'createdAt'>;

export const JOB_STATUSES: readonly JobStatus[] = ['draft', 'open', 'on-hold', 'closed'];

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  'full-time',
  'part-time',
  'contract',
  'internship',
];

export const WORK_MODES: readonly WorkMode[] = ['on-site', 'hybrid', 'remote'];

export const JOB_STATUS_LABELS: Readonly<Record<JobStatus, string>> = {
  draft: 'Draft',
  open: 'Open',
  'on-hold': 'On hold',
  closed: 'Closed',
};
