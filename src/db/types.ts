export interface Word {
  id: string;
  /** The word in Chinese characters, e.g. 学校 */
  word: string;
  /** How it's read, in pinyin with tone marks, e.g. xuéxiào */
  reading: string;
  /** In Vietnamese, e.g. trường học */
  meaning: string;
  tags: string[];
  /** Where its picture is stored (`<owner id>/<picture id>`); a word has at most one picture. */
  imagePath?: string;
  createdAt: number;
  updatedAt: number;
}

/** A copy of a word as it was when practised, so history survives later edits or deletes. */
export interface PracticeWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  /** Ticked off during the speech. */
  used: boolean;
}

export interface PracticeLog {
  id: string;
  /** When the speaking timer started. */
  startedAt: number;
  endedAt: number;
  timeLimitSec: number;
  /** Time actually spent speaking, excluding pauses. */
  spokenSec: number;
  endedEarly: boolean;
  words: PracticeWord[];
  notes: string;
  /** Set when the session was started from an assignment. */
  assignmentId?: string;
}

/** A copy of one of the teacher's words, made when the assignment was saved. */
export type AssignmentWord = Pick<PracticeWord, 'id' | 'word' | 'reading' | 'meaning'>;

/** Speaking practice a teacher gives to some students. */
export interface Assignment {
  id: string;
  teacherId: string;
  title: string;
  /** A topic or what to talk about; may be empty. */
  instructions: string;
  /** The word bank each attempt draws from. */
  words: AssignmentWord[];
  /** How many words each attempt draws. */
  wordCount: number;
  timeLimitSec: number;
  /** To be done by the end of this day (YYYY-MM-DD), if set. */
  dueOn: string | null;
  /** Who it's given to. A student sees only themselves here. */
  studentIds: string[];
  createdAt: number;
}

/** A practice session started from an assignment: just what's needed to tell whether it counts. */
export interface AssignmentAttempt {
  /** The practice session's id. */
  id: string;
  ownerId: string;
  assignmentId: string;
  startedAt: number;
  endedAt: number;
  spokenSec: number;
  timeLimitSec: number;
}

export type Role = 'student' | 'teacher';

export interface Profile {
  id: string;
  displayName: string;
  /** Set for accounts that sign in with a username rather than an email address. */
  username: string | null;
  email: string | null;
  role: Role;
  createdAt: number;
}

/** An account with its totals, for the teacher's list of students. */
export interface AccountSummary extends Profile {
  wordCount: number;
  practiceCount: number;
  spokenSec: number;
  lastPracticeAt: number | null;
}
