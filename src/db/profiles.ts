import { check, myId, supabase } from '../lib/supabase';
import type { Database } from './database.types';
import { changed } from './store';
import type { AccountSummary, Profile, Role } from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type SummaryRow = Database['public']['Views']['account_summaries']['Row'];

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    email: row.email,
    role: row.role === 'teacher' ? 'teacher' : 'student',
    createdAt: Date.parse(row.created_at),
  };
}

function toSummary(row: SummaryRow): AccountSummary {
  return {
    ...toProfile({
      id: row.id ?? '',
      display_name: row.display_name ?? '',
      username: row.username,
      email: row.email,
      role: row.role ?? 'student',
      created_at: row.created_at ?? new Date(0).toISOString(),
    }),
    wordCount: row.word_count ?? 0,
    practiceCount: row.practice_count ?? 0,
    spokenSec: row.spoken_sec ?? 0,
    lastPracticeAt: row.last_practice_at ? Date.parse(row.last_practice_at) : null,
  };
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const row = check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle());
  return row && toProfile(row);
}

/** Every account the signed-in one may see: everyone for a teacher, only themselves for a student. */
export async function fetchAccountSummaries(): Promise<AccountSummary[]> {
  const rows = check(await supabase.from('account_summaries').select('*').order('display_name'));
  return rows.map(toSummary).sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
}

export async function renameMe(displayName: string): Promise<void> {
  const id = await myId();
  check(await supabase.from('profiles').update({ display_name: displayName }).eq('id', id));
  changed(id);
}

export async function changeMyPassword(password: string): Promise<void> {
  check(await supabase.auth.updateUser({ password }));
}

/** Teachers only. */
export async function setAccountRole(id: string, role: Role): Promise<void> {
  check(await supabase.rpc('set_account_role', { target: id, new_role: role }));
  changed(id);
}

/** Teachers only, and only for students. */
export async function resetStudentPassword(id: string, password: string): Promise<void> {
  check(await supabase.rpc('reset_student_password', { target: id, new_password: password }));
}
