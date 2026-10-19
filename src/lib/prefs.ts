import { useEffect, useState } from 'react';

const PREFIX = 'cihui:';

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * State remembered in this browser between visits (last-used settings and the like).
 * `sanitize` turns whatever was stored, possibly nothing or something stale, into a valid value.
 */
export function useRememberedState<T>(key: string, sanitize: (stored: unknown) => T) {
  const [value, setValue] = useState<T>(() => sanitize(read(key)));
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode, blocked site data); it's only a convenience.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
