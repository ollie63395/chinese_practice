import { check, myId, supabase } from '../lib/supabase';
import type { Database } from './database.types';
import { invalidate } from './store';
import type { Assignment, AssignmentAttempt, AssignmentWord } from './types';

type AssignmentRow = Database['public']['Tables']['assignments']['Row'];

function toAssignment(row: AssignmentRow & { assignment_students: { student_id: string }[] }): Assignment {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    title: row.title,
    instructions: row.instructions,
    words: row.words as unknown as AssignmentWord[],
    wordCount: row.word_count,
    timeLimitSec: row.time_limit_sec,
    dueOn: row.due_on,
    studentIds: row.assignment_students.map((s) => s.student_id),
    createdAt: Date.parse(row.created_at),
  };
}

/** Every assignment for a teacher; for a student, only those given to them. Newest first. */
export async function fetchAssignments(): Promise<Assignment[]> {
  const rows = check(
    await supabase
      .from('assignments')
      .select('*, assignment_students(student_id)')
      .order('created_at', { ascending: false }),
  );
  return rows.map(toAssignment);
}

/**
 * Every session started from an assignment that the signed-in account may see: everyone's for a
 * teacher, their own for a student.
 */
export async function fetchAssignmentAttempts(): Promise<AssignmentAttempt[]> {
  const rows = check(
    await supabase
      .from('practices')
      .select('id, owner_id, assignment_id, started_at, ended_at, spoken_sec, time_limit_sec')
      .not('assignment_id', 'is', null)
      .order('started_at'),
  );
  return rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    assignmentId: row.assignment_id ?? '',
    startedAt: Date.parse(row.started_at),
    endedAt: Date.parse(row.ended_at),
    spokenSec: row.spoken_sec,
    timeLimitSec: row.time_limit_sec,
  }));
}

export interface AssignmentDraft {
  title: string;
  instructions: string;
  words: AssignmentWord[];
  wordCount: number;
  timeLimitSec: number;
  dueOn: string | null;
  studentIds: string[];
}

/** Teachers only: creates an assignment, or changes one of theirs, and who it's given to. Returns its id. */
export async function saveAssignment(draft: AssignmentDraft, id?: string): Promise<string> {
  const fields = {
    title: draft.title,
    instructions: draft.instructions,
    // Only what a student needs: nothing else from the teacher's words is copied.
    words: draft.words.map(({ id: wordId, word, reading, meaning }) => ({ id: wordId, word, reading, meaning })),
    word_count: draft.wordCount,
    time_limit_sec: Math.round(draft.timeLimitSec),
    due_on: draft.dueOn,
    updated_at: new Date().toISOString(),
  };
  try {
    if (!id) {
      const teacher = await myId();
      const { id: newId } = check(
        await supabase.from('assignments').insert({ ...fields, teacher_id: teacher }).select('id').single(),
      );
      const given = await supabase
        .from('assignment_students')
        .insert(draft.studentIds.map((student_id) => ({ assignment_id: newId, student_id })));
      if (given.error) {
        // Don't leave behind an assignment nobody has.
        await supabase.from('assignments').delete().eq('id', newId);
        check(given);
      }
      return newId;
    }

    check(await supabase.from('assignments').update(fields).eq('id', id).select('id').single());
    const current = check(await supabase.from('assignment_students').select('student_id').eq('assignment_id', id));
    const before = new Set(current.map((row) => row.student_id));
    const after = new Set(draft.studentIds);
    const added = draft.studentIds.filter((student) => !before.has(student));
    const removed = [...before].filter((student) => !after.has(student));
    if (added.length > 0) {
      check(await supabase.from('assignment_students').insert(added.map((student_id) => ({ assignment_id: id, student_id }))));
    }
    if (removed.length > 0) {
      check(await supabase.from('assignment_students').delete().eq('assignment_id', id).in('student_id', removed));
    }
    return id;
  } finally {
    invalidate('assignment');
  }
}

/** Teachers only. Sessions done for it stay in the students' history. */
export async function deleteAssignment(id: string): Promise<void> {
  check(await supabase.from('assignments').delete().eq('id', id));
  invalidate('assignment');
}
