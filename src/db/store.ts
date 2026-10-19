import { useCallback, useSyncExternalStore } from 'react';

interface Snapshot {
  data?: unknown;
  error?: unknown;
}

interface Entry {
  snapshot: Snapshot;
  /** Needs loading (again) the next time something uses it. */
  stale: boolean;
  loading: boolean;
  listeners: Set<() => void>;
  load: () => Promise<unknown>;
}

const entries = new Map<string, Entry>();
const EMPTY: Snapshot = {};

function refresh(entry: Entry) {
  if (entry.loading) {
    // Changed while loading: load once more when this finishes.
    entry.stale = true;
    return;
  }
  entry.loading = true;
  entry.stale = false;
  entry
    .load()
    .then(
      (data) => {
        entry.snapshot = { data };
      },
      (error: unknown) => {
        // Keep showing what was loaded before, if anything, and try again next time.
        entry.snapshot = { data: entry.snapshot.data, error };
        entry.stale = true;
      },
    )
    .finally(() => {
      entry.loading = false;
      for (const listener of entry.listeners) listener();
      if (entry.stale && !entry.snapshot.error && entry.listeners.size > 0) refresh(entry);
    });
}

/**
 * Data from the server, cached by key and shared by every component that asks for it.
 * `undefined` while loading the first time; afterwards the cached copy shows while a fresh one
 * loads. If loading fails with nothing to show, the error is thrown for the page's error screen.
 * `load` must always load the same thing for the same key.
 */
export function useQuery<T>(key: string | null, load: () => Promise<T>): T | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (key === null) return () => {};
      let entry = entries.get(key);
      if (!entry) {
        entry = { snapshot: EMPTY, stale: true, loading: false, listeners: new Set(), load };
        entries.set(key, entry);
      }
      const current = entry;
      current.listeners.add(onChange);
      if (current.stale) refresh(current);
      return () => current.listeners.delete(onChange);
    },
    // `load` is left out on purpose: see above.
    [key],
  );
  const snapshot = useSyncExternalStore(subscribe, () => (key === null ? EMPTY : (entries.get(key)?.snapshot ?? EMPTY)));
  if (snapshot.error && snapshot.data === undefined) throw snapshot.error;
  return snapshot.data as T | undefined;
}

/** Marks cached data whose key starts with `prefix` as out of date; what's on screen reloads. */
export function invalidate(prefix = ''): void {
  for (const [key, entry] of entries) {
    if (!key.startsWith(prefix)) continue;
    entry.stale = true;
    if (entry.listeners.size > 0) refresh(entry);
  }
}

/** After a change to an account's words, practice history or profile, reload whatever shows them. */
export function changed(ownerId: string): void {
  invalidate(`${ownerId}/`);
  invalidate('accounts');
}

/** Forgets everything, e.g. on signing out, so the next account never sees the last one's data. */
export function clearQueries(): void {
  entries.clear();
}

// Coming back to the app (or back online), pick up changes made on other devices.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') invalidate();
  });
  window.addEventListener('online', () => invalidate());
}
