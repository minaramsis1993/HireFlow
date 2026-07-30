/**
 * JSON-shaped `localStorage` access that never throws.
 *
 * Private browsing, disabled storage and quota errors all degrade to "no value
 * stored" rather than taking a store constructor down with them.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is unavailable — the session simply does not survive a reload.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do; the key is unreachable either way.
  }
}
