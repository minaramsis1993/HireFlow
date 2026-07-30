/**
 * Descriptor for an uploaded CV.
 *
 * The prototype keeps metadata only. `url` is an object URL that lives as long
 * as the browser tab; once object storage exists it becomes a signed, expiring
 * link and nothing else about this type changes.
 */
export interface ResumeFile {
  readonly name: string;
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly uploadedAt: string;
  readonly url: string | null;
}

export const RESUME_MIME_TYPE = 'application/pdf';

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export function describeFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  return kilobytes < 1024 ? `${Math.round(kilobytes)} KB` : `${(kilobytes / 1024).toFixed(1)} MB`;
}

/** Validates an upload before it reaches a store; returns `null` when it passes. */
export function resumeRejectionReason(file: File): string | null {
  if (file.type !== RESUME_MIME_TYPE) {
    return 'Only PDF files are accepted.';
  }

  if (file.size > RESUME_MAX_BYTES) {
    return `Keep the file under ${describeFileSize(RESUME_MAX_BYTES)}.`;
  }

  return null;
}
