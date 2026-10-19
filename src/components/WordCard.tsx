import { Link } from 'react-router';
import type { Word } from '../db/types';
import { cn } from '../lib/cn';
import { SpeakButton } from './SpeakButton';
import { MixedText, TagChip } from './ui';
import { WordImage } from './WordImage';

interface WordCardProps {
  word: Word;
  /** For a teacher looking at a student's words: no link to the edit page. */
  readOnly?: boolean;
}

/** A word in a list. The whole card links to the edit page, unless it's read-only. */
export function WordCard({ word, readOnly }: WordCardProps) {
  const heading = (
    <>
      <span lang="zh-Hans" className="block truncate font-zh text-2xl leading-tight font-semibold">
        {word.word}
      </span>
      {word.reading !== word.word && (
        <span lang="zh-Latn-pinyin" className="block truncate font-pinyin text-sm text-accent-ink">
          {word.reading}
        </span>
      )}
    </>
  );
  return (
    // min-w-0 lets a long phrase truncate instead of widening a single-column grid on phones.
    <li
      className={cn(
        'relative flex min-w-0 gap-4 rounded-2xl border border-line bg-card p-4 shadow-xs transition',
        !readOnly && 'hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md',
      )}
    >
      <WordImage path={word.imagePath} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1 pr-8">
        {readOnly ? (
          heading
        ) : (
          <Link
            to={`/words/${word.id}`}
            className="block after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            {heading}
          </Link>
        )}
        {/* Padding rather than margin above: the clipped box needs room for stacked marks on capitals (Ấ, Ổ). */}
        <p className="line-clamp-2 pt-1 text-sm text-muted">
          <MixedText>{word.meaning}</MixedText>
        </p>
        {word.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {word.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>
      <SpeakButton text={word.word} className="absolute top-2 right-2 z-10" />
    </li>
  );
}
