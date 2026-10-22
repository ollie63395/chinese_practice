import { describe, expect, it } from 'vitest';
import type { Assignment, AssignmentAttempt } from '../db/types';
import { assignmentProgress, countStatuses, progressByStudent, sortForStudent, statusLabel } from './assignments';

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();

/** A 2-minute attempt on 20 October, at noon unless said otherwise. */
function attempt(spokenSec: number, extra: Partial<AssignmentAttempt> = {}): AssignmentAttempt {
  const startedAt = extra.startedAt ?? at(20);
  return {
    id: `p-${Math.random()}`,
    ownerId: 'an',
    assignmentId: 'a1',
    startedAt,
    endedAt: startedAt + spokenSec * 1000,
    spokenSec,
    timeLimitSec: 120,
    ...extra,
  };
}

function assignment(extra: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    teacherId: 'co',
    title: 'Kể về trường học',
    instructions: '',
    words: [],
    wordCount: 3,
    timeLimitSec: 120,
    dueOn: null,
    studentIds: ['an', 'binh'],
    createdAt: at(19),
    ...extra,
  };
}

describe('assignmentProgress', () => {
  it('is not started without attempts', () => {
    expect(assignmentProgress([], null, at(21))).toMatchObject({ status: 'not-started', attempts: 0, bestSpokenSec: 0, lastAttempt: null });
  });

  it('is only tried when every attempt ended early', () => {
    const p = assignmentProgress([attempt(30), attempt(95)], null, at(21));
    expect(p).toMatchObject({ status: 'tried', attempts: 2, bestSpokenSec: 95, completedAt: null });
  });

  it('is done once an attempt ran the whole time', () => {
    const full = attempt(120, { startedAt: at(20, 15) });
    const p = assignmentProgress([attempt(30), full], null, at(21));
    expect(p).toMatchObject({ status: 'done', completedAt: full.endedAt, late: false, lastAttempt: full });
  });

  it('judges each attempt by its own time limit', () => {
    // The assignment may have been changed to 3 minutes since; this attempt was for 1.
    expect(assignmentProgress([attempt(60, { timeLimitSec: 60 })], null, at(21)).status).toBe('done');
  });

  it('dates completion from the first attempt that counted', () => {
    const first = attempt(120, { startedAt: at(20, 9) });
    const later = attempt(120, { startedAt: at(22, 9) });
    const p = assignmentProgress([later, first], null, at(23));
    expect(p.completedAt).toBe(first.endedAt);
    expect(p.lastAttempt).toBe(later);
  });

  it('is overdue only once the due day is over', () => {
    expect(assignmentProgress([], '2026-10-20', at(20, 23)).status).toBe('not-started');
    expect(assignmentProgress([], '2026-10-20', at(21, 0)).status).toBe('overdue');
    expect(assignmentProgress([attempt(30)], '2026-10-20', at(21)).status).toBe('overdue');
  });

  it('marks work finished after the due day as late', () => {
    const onTime = assignmentProgress([attempt(120, { startedAt: at(20, 23) - 200_000 })], '2026-10-20', at(25));
    expect(onTime).toMatchObject({ status: 'done', late: false });
    const late = assignmentProgress([attempt(120, { startedAt: at(21, 8) })], '2026-10-20', at(25));
    expect(late).toMatchObject({ status: 'done', late: true });
    expect(statusLabel(late)).toBe('Hoàn thành muộn');
  });

  it('is never overdue or late without a due day', () => {
    expect(assignmentProgress([], null, at(31)).status).toBe('not-started');
    expect(assignmentProgress([attempt(120)], null, at(31)).late).toBe(false);
  });
});

describe('progressByStudent', () => {
  it('gives every student their own progress, ignoring other assignments', () => {
    const attempts = [
      attempt(120),
      attempt(120, { ownerId: 'binh', assignmentId: 'other' }),
      attempt(40, { ownerId: 'cuong' }),
    ];
    const progress = progressByStudent(assignment(), attempts, at(21));
    expect([...progress.keys()]).toEqual(['an', 'binh']);
    expect(progress.get('an')?.status).toBe('done');
    expect(progress.get('binh')?.status).toBe('not-started');
    expect(countStatuses(progress.values())).toEqual({ 'not-started': 1, tried: 0, overdue: 0, done: 1 });
  });
});

describe('sortForStudent', () => {
  it('puts work to do first, soonest due first, then what’s done', () => {
    const item = (id: string, dueOn: string | null, status: 'done' | 'tried') => ({
      id,
      assignment: assignment({ id, dueOn }),
      progress: assignmentProgress(status === 'done' ? [attempt(120)] : [attempt(10)], dueOn, at(19)),
    });
    const sorted = sortForStudent([
      item('done', '2026-10-21', 'done'),
      item('no-date', null, 'tried'),
      item('later', '2026-10-30', 'tried'),
      item('sooner', '2026-10-25', 'tried'),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['sooner', 'later', 'no-date', 'done']);
  });
});
