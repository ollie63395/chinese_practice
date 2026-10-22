import type { Assignment, AssignmentAttempt, Word } from '../db/types';
import { parseIsoDate } from './time';

/** An attempt counts once the student has spoken for the whole time, i.e. the timer ran out. */
export function isComplete(attempt: Pick<AssignmentAttempt, 'spokenSec' | 'timeLimitSec'>): boolean {
  return attempt.spokenSec >= attempt.timeLimitSec;
}

export type AssignmentStatus = 'not-started' | 'tried' | 'overdue' | 'done';

export interface AssignmentProgress {
  status: AssignmentStatus;
  /** Done, but only after the due day. */
  late: boolean;
  attempts: number;
  bestSpokenSec: number;
  /** When the first attempt that counted ended. */
  completedAt: number | null;
  /** The most recent attempt, to open it. */
  lastAttempt: AssignmentAttempt | null;
}

/**
 * How far one student is with one assignment, worked out from their attempts at it. Each attempt
 * is judged by its own time limit, so changing the assignment later doesn't rewrite the past.
 */
export function assignmentProgress(
  attempts: readonly AssignmentAttempt[],
  dueOn: string | null,
  now = Date.now(),
): AssignmentProgress {
  const byStart = [...attempts].sort((a, b) => a.startedAt - b.startedAt);
  const completedAt = Math.min(...byStart.filter(isComplete).map((a) => a.endedAt));
  const done = Number.isFinite(completedAt);
  const deadline = dueOn ? parseIsoDate(dueOn, true) : Infinity;
  const status: AssignmentStatus = done
    ? 'done'
    : now >= deadline
      ? 'overdue'
      : attempts.length > 0
        ? 'tried'
        : 'not-started';
  return {
    status,
    late: done && completedAt >= deadline,
    attempts: attempts.length,
    bestSpokenSec: Math.max(0, ...attempts.map((a) => a.spokenSec)),
    completedAt: done ? completedAt : null,
    lastAttempt: byStart.at(-1) ?? null,
  };
}

/** One student's progress with an assignment, from everyone's attempts at anything. */
export function studentProgress(
  assignment: Assignment,
  attempts: readonly AssignmentAttempt[],
  studentId: string,
  now = Date.now(),
): AssignmentProgress {
  return assignmentProgress(
    attempts.filter((a) => a.assignmentId === assignment.id && a.ownerId === studentId),
    assignment.dueOn,
    now,
  );
}

/** Each of an assignment's students' progress, by student id. */
export function progressByStudent(
  assignment: Assignment,
  attempts: readonly AssignmentAttempt[],
  now = Date.now(),
): Map<string, AssignmentProgress> {
  return new Map(assignment.studentIds.map((student) => [student, studentProgress(assignment, attempts, student, now)]));
}

/** How many students are at each status. */
export function countStatuses(progress: Iterable<AssignmentProgress>): Record<AssignmentStatus, number> {
  const counts: Record<AssignmentStatus, number> = { 'not-started': 0, tried: 0, overdue: 0, done: 0 };
  for (const p of progress) counts[p.status]++;
  return counts;
}

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  'not-started': 'Chưa luyện',
  tried: 'Đã thử',
  overdue: 'Quá hạn',
  done: 'Đã hoàn thành',
};

/** What the status pill says. */
export function statusLabel(progress: AssignmentProgress): string {
  return progress.late ? 'Hoàn thành muộn' : STATUS_LABELS[progress.status];
}

/** A student's list: what's still to do first (soonest due first, no due day last), then what's done. */
export function sortForStudent<T extends { assignment: Assignment; progress: AssignmentProgress }>(items: readonly T[]): T[] {
  const due = (a: Assignment) => (a.dueOn ? parseIsoDate(a.dueOn) : Infinity);
  return [...items].sort((x, y) => {
    const xDone = x.progress.status === 'done';
    const yDone = y.progress.status === 'done';
    if (xDone !== yDone) return xDone ? 1 : -1;
    if (xDone) return (y.progress.completedAt ?? 0) - (x.progress.completedAt ?? 0);
    return due(x.assignment) - due(y.assignment) || y.assignment.createdAt - x.assignment.createdAt;
  });
}

/** An assignment's words, shaped for the speaking practice. They have no tags or pictures. */
export function assignmentWords(assignment: Assignment): Word[] {
  return assignment.words.map((w) => ({
    ...w,
    tags: [],
    createdAt: assignment.createdAt,
    updatedAt: assignment.createdAt,
  }));
}
