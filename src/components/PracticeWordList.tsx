import { Check } from 'lucide-react';
import type { PracticeWord } from '../db/types';
import { MixedText } from './ui';
import { WordImage } from './WordImage';

interface PracticeWordListProps {
  words: PracticeWord[];
  /** Show which words were ticked off during the speech. */
  showUsed: boolean;
  /** Pictures of words that are still in the word bank, by word id. */
  imageIds?: Map<string, string>;
}

export function PracticeWordList({ words, showUsed, imageIds }: PracticeWordListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {words.map((word) => (
        <li key={word.id} className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs">
          <WordImage imageId={imageIds?.get(word.id)} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p lang="zh-Hans" className="font-zh text-xl leading-tight font-semibold">
              {word.word}
            </p>
            {word.reading && word.reading !== word.word && (
              <p lang="zh-Latn-pinyin" className="font-pinyin text-sm text-accent-ink">
                {word.reading}
              </p>
            )}
            <p className="mt-0.5 text-sm text-muted">
              <MixedText>{word.meaning}</MixedText>
            </p>
          </div>
          {showUsed &&
            (word.used ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-xs font-medium text-good">
                <Check className="size-3.5" /> Đã dùng
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">Chưa dùng</span>
            ))}
        </li>
      ))}
    </ul>
  );
}
