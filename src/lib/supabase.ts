import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import { errorMessage } from './errors';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False when the site was built without its Supabase settings (see .env.example). */
export const isConfigured = Boolean(url && key);

// Read before the client is created: it consumes what an emailed link put after the #.
const arrival = typeof window === 'undefined' ? null : new URL(window.location.href);

// The session is kept in localStorage, so people stay signed in across reloads and restarts.
export const supabase = createClient<Database>(url || 'http://localhost', key || 'not-configured');

/** Added to the address a password-reset email links back to. */
export const SET_PASSWORD_PARAM = 'set-password';

let linkError: string | null = null;
let passwordResetPending = false;

/**
 * A password-reset email links back with its result after the #, where the router keeps its
 * paths. Call before starting the router: Supabase reads the link first, then the URL is tidied.
 */
export async function settleEmailLink(): Promise<void> {
  if (!arrival) return;
  const hash = new URLSearchParams(arrival.hash.slice(1));
  const fromLink = hash.has('access_token') || hash.has('error_description');
  await supabase.auth.getSession();
  if (!fromLink && !arrival.searchParams.has(SET_PASSWORD_PARAM)) return;
  linkError = hash.get('error_description');
  passwordResetPending = hash.has('access_token') && arrival.searchParams.has(SET_PASSWORD_PARAM);
  const search = new URLSearchParams(arrival.search);
  search.delete(SET_PASSWORD_PARAM);
  const query = search.toString();
  window.history.replaceState(null, '', `${arrival.pathname}${query ? `?${query}` : ''}#/`);
}

/** Whether the app was opened from a password-reset email; true only the first time it's asked. */
export function takePasswordResetPending(): boolean {
  const pending = passwordResetPending;
  passwordResetPending = false;
  return pending;
}

/** The problem with the emailed link the app was opened from (e.g. it had expired), if any. */
export function takeLinkError(): string | null {
  const error = linkError;
  linkError = null;
  return error;
}

/** The signed-in account's id. */
export async function myId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Phiên đăng nhập đã hết. Hãy đăng nhập lại.');
  return id;
}

/** What a Supabase call returns when it works (its results are "data, or an error"). */
type Success<R> = R extends { error: null; data: infer T } ? T : never;

/** The data from a Supabase call, or its error as an Error with a message in Vietnamese. */
export function check<R extends { data: unknown; error: unknown }>(result: R): Success<R> {
  if (result.error) throw new Error(errorMessage(result.error), { cause: result.error });
  return result.data as Success<R>;
}
