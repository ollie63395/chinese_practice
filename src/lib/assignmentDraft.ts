import { useEffect, useRef } from 'react';
import { MAX_SPEECH_SECONDS, MIN_SPEECH_SECONDS } from '../components/NumberInputs';
import { isRecord, readStored, removeStored, stringArray, writeStored } from './prefs';
import { formatDay, formatTime } from './time';

/** What a teacher has filled in on the assignment form. */
export interface AssignmentFormFields {
  title: string;
  instructions: string;
  /** Whose word bank the words are picked from (an account id). */
  bank: string;
  source: 'all' | 'tags' | 'pick';
  tags: string[];
  /** Ids of the words picked one by one. */
  picked: string[];
  /** How many words each attempt draws. It can be more than there are; the form caps it. */
  count: number;
  timeLimitSec: number;
  /** YYYY-MM-DD, or empty for none. */
  dueOn: string;
  studentIds: string[];
}

/**
 * A new assignment the teacher started but hasn't given out yet. It's kept in this browser, so
 * going to another page, reloading or closing the tab loses nothing.
 */
export interface AssignmentFormDraft extends AssignmentFormFields {
  /** When it was last changed. */
  savedAt: number;
}

/** "lưu hôm nay lúc 14:05" */
export function savedLabel(draft: AssignmentFormDraft, now = Date.now()): string {
  return `lưu ${formatDay(draft.savedAt, now).toLowerCase()} lúc ${formatTime(draft.savedAt)}`;
}

/** A new assignment's form before anything is filled in. */
export function blankFields(bank: string): AssignmentFormFields {
  return {
    title: '',
    instructions: '',
    bank,
    source: 'all',
    tags: [],
    picked: [],
    count: 5,
    timeLimitSec: 120,
    dueOn: '',
    studentIds: [],
  };
}

/**
 * Nothing worth keeping has been filled in. Only looking around, at another bank or another way
 * of choosing words, doesn't count.
 */
export function isBlank(fields: AssignmentFormFields): boolean {
  const blank = blankFields(fields.bank);
  return (
    !fields.title.trim() &&
    !fields.instructions.trim() &&
    fields.tags.length === 0 &&
    fields.picked.length === 0 &&
    fields.count === blank.count &&
    fields.timeLimitSec === blank.timeLimitSec &&
    !fields.dueOn &&
    fields.studentIds.length === 0
  );
}

/** A draft as read back from storage, with anything unusable put right; null if there's none worth having. */
export function sanitizeDraft(stored: unknown): AssignmentFormDraft | null {
  if (!isRecord(stored)) return null;
  const { bank, count, timeLimitSec, dueOn, savedAt } = stored;
  if (typeof bank !== 'string' || typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null;
  const blank = blankFields(bank);
  const draft: AssignmentFormDraft = {
    title: typeof stored.title === 'string' ? stored.title : '',
    instructions: typeof stored.instructions === 'string' ? stored.instructions : '',
    bank,
    source: stored.source === 'tags' || stored.source === 'pick' ? stored.source : 'all',
    tags: stringArray(stored.tags),
    picked: stringArray(stored.picked),
    count: typeof count === 'number' && Number.isInteger(count) && count >= 1 ? count : blank.count,
    timeLimitSec:
      typeof timeLimitSec === 'number' && timeLimitSec >= MIN_SPEECH_SECONDS && timeLimitSec <= MAX_SPEECH_SECONDS
        ? Math.round(timeLimitSec)
        : blank.timeLimitSec,
    dueOn: typeof dueOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueOn) ? dueOn : '',
    studentIds: stringArray(stored.studentIds),
    savedAt,
  };
  return isBlank(draft) ? null : draft;
}

/**
 * A draft fitted to the students there are now (account ids), as some may have gone since it
 * was saved: it's only given to those still here, and a bank no longer there falls back to the
 * teacher's own (`me`).
 */
export function fitDraft(draft: AssignmentFormDraft, me: string, students: readonly string[]): AssignmentFormDraft {
  const here = new Set(students);
  return {
    ...draft,
    bank: here.has(draft.bank) ? draft.bank : me,
    studentIds: draft.studentIds.filter((id) => here.has(id)),
  };
}

// One per teacher, so teachers sharing a computer each keep their own.
const storageKey = (teacherId: string) => `assignment-draft:${teacherId}`;

export function readDraft(teacherId: string): AssignmentFormDraft | null {
  return sanitizeDraft(readStored(storageKey(teacherId)));
}

export function clearDraft(teacherId: string): void {
  removeStored(storageKey(teacherId));
}

/**
 * Keeps the form's fields as the teacher's draft whenever they change, or clears it when the form
 * is blank again. Does nothing while `teacherId` is null (an assignment that's already given out
 * saves its changes straight away).
 */
export function useKeepDraft(teacherId: string | null, fields: AssignmentFormFields): void {
  const json = JSON.stringify(fields);
  // What the form opened with is already kept, or blank, so only changes since are saved. That
  // also keeps a draft's time from moving on just because it was opened.
  const kept = useRef(json);
  useEffect(() => {
    if (!teacherId || json === kept.current) return;
    kept.current = json;
    const next = JSON.parse(json) as AssignmentFormFields;
    if (isBlank(next)) clearDraft(teacherId);
    else writeStored(storageKey(teacherId), { ...next, savedAt: Date.now() } satisfies AssignmentFormDraft);
  }, [teacherId, json]);
}
