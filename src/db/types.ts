export interface Word {
  id: string;
  /** The word in Chinese characters, e.g. 学校 */
  word: string;
  /** How it's read, in pinyin with tone marks, e.g. xuéxiào */
  reading: string;
  /** In Vietnamese, e.g. trường học */
  meaning: string;
  tags: string[];
  /** Points at a record in the `images` table; a word has at most one image. */
  imageId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredImage {
  id: string;
  blob: Blob;
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
}
