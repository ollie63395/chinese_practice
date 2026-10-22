import { uid } from '../lib/id';
import { check, myId, supabase } from '../lib/supabase';
import type { Database } from './database.types';
import { changed } from './store';
import type { PracticeLog, PracticeWord } from './types';

type PracticeRow = Database['public']['Tables']['practices']['Row'];
type PracticeInsert = Database['public']['Tables']['practices']['Insert'];

export function toPracticeLog(row: PracticeRow): PracticeLog {
  return {
    id: row.id,
    startedAt: Date.parse(row.started_at),
    endedAt: Date.parse(row.ended_at),
    timeLimitSec: row.time_limit_sec,
    spokenSec: row.spoken_sec,
    endedEarly: row.ended_early,
    words: row.words as unknown as PracticeWord[],
    notes: row.notes,
    ...(row.assignment_id ? { assignmentId: row.assignment_id } : {}),
  };
}

/**
 * The link to an assignment is only included when the log has one, so restoring a backup
 * (whose sessions never carry it) leaves the links of sessions already saved alone.
 */
export function toPracticeRow(log: PracticeLog, ownerId: string): PracticeInsert {
  return {
    ...(log.assignmentId ? { assignment_id: log.assignmentId } : {}),
    owner_id: ownerId,
    id: log.id,
    started_at: new Date(log.startedAt).toISOString(),
    ended_at: new Date(log.endedAt).toISOString(),
    time_limit_sec: Math.round(log.timeLimitSec),
    spoken_sec: Math.round(log.spokenSec),
    ended_early: log.endedEarly,
    words: log.words as unknown as PracticeRow['words'],
    notes: log.notes,
  };
}

/** All of an account's practice sessions, newest first. */
export async function fetchPractices(ownerId: string): Promise<PracticeLog[]> {
  const rows = check(
    await supabase.from('practices').select('*').eq('owner_id', ownerId).order('started_at', { ascending: false }),
  );
  return rows.map(toPracticeLog);
}

export async function fetchPractice(ownerId: string, id: string): Promise<PracticeLog | null> {
  const row = check(await supabase.from('practices').select('*').eq('owner_id', ownerId).eq('id', id).maybeSingle());
  return row && toPracticeLog(row);
}

export async function addPractice(log: Omit<PracticeLog, 'id'>): Promise<PracticeLog> {
  const owner = await myId();
  const record: PracticeLog = { ...log, id: uid() };
  check(await supabase.from('practices').insert(toPracticeRow(record, owner)));
  changed(owner);
  return record;
}

export async function deletePractice(id: string): Promise<void> {
  const owner = await myId();
  check(await supabase.from('practices').delete().eq('owner_id', owner).eq('id', id));
  changed(owner);
}
