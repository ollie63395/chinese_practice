import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** An object URL for a blob, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Cíhuì` : 'Cíhuì';
  }, [title]);
}

/** Goes back in history, or to `fallback` when the page was opened directly. */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key !== 'default') void navigate(-1);
    else void navigate(fallback);
  };
}

/** Keeps the screen on while `active`, where supported (needs https or localhost). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let released = false;
    const request = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        if (released) void next.release();
        else lock = next;
      } catch {
        // Denied, or the page isn't visible; nothing to do.
      }
    };
    // The browser drops the lock whenever the page is hidden, so take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void lock?.release();
    };
  }, [active]);
}

/** Warns before closing or reloading the tab while `active`. */
export function useBeforeUnload(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
}
