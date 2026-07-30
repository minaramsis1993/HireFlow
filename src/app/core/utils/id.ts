/** Generates a stable, prefixed client-side id (`job-3f1a…`). */
export function createId(prefix: string): string {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${unique}`;
}
