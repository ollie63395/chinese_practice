/**
 * Supabase Auth only knows email addresses, so an account that signs in with a username is
 * stored under a made-up address on this domain (.invalid is reserved and never receives mail).
 */
export const USERNAME_DOMAIN = 'users.cihui.invalid';

export const MIN_PASSWORD_LENGTH = 6;

/** 3–30 lowercase letters, digits, dots, dashes or underscores, e.g. "nguyen.an". */
const USERNAME = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME.test(username);
}

export function isEmail(login: string): boolean {
  return login.includes('@');
}

/** What to send to Supabase Auth for what was typed in "email or username". */
export function loginToEmail(login: string): string {
  const value = login.trim().toLowerCase();
  return isEmail(value) ? value : `${value}@${USERNAME_DOMAIN}`;
}

/** How an account signs in, for showing it: its username, or its email address. */
export function loginLabel(account: { username: string | null; email: string | null }): string {
  return account.username ?? account.email ?? '';
}
