import { useEffect, useState } from 'react';

const PREFIX = 'cihui:';

// Storage can be unavailable (private mode, blocked site data), so what's kept in this browser is
// only ever a convenience: reading gives `undefined` and writing does nothing.

/** What's kept in this browser under `key`, or `undefined`. */
export function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // See above.
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // See above.
  }
}

/**
 * State remembered in this browser between visits (last-used settings and the like).
 * `sanitize` turns whatever was stored, possibly nothing or something stale, into a valid value.
 */
export function useRememberedState<T>(key: string, sanitize: (stored: unknown) => T) {
  const [value, setValue] = useState<T>(() => sanitize(readStored(key)));
  useEffect(() => writeStored(key, value), [key, value]);
  return [value, setValue] as const;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
