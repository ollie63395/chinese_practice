import { Link } from 'react-router';
import type { Word } from '../db/types';
import { SpeakButton } from './SpeakButton';
import { MixedText, TagChip } from './ui';
import { WordImage } from './WordImage';

/** A word in a list. The whole card links to the edit page. */
export function WordCard({ word }: { word: Word }) {
  return (
    // min-w-0 lets a long phrase truncate instead of widening a single-column grid on phones.
    <li className="relative flex min-w-0 gap-4 rounded-2xl border border-line bg-card p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
      <WordImage imageId={word.imageId} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1 pr-8">
        <Link
          to={`/words/${word.id}`}
          className="block after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
        >
          <span lang="zh-Hans" className="block truncate font-zh text-2xl leading-tight font-semibold">
            {word.word}
          </span>
          {word.reading !== word.word && (
            <span lang="zh-Latn-pinyin" className="block truncate font-pinyin text-sm text-accent-ink">
              {word.reading}
            </span>
          )}
        </Link>
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
