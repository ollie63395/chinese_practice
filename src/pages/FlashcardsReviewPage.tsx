import { Check, Layers, PartyPopper, Repeat, RotateCcw, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { SpeakButton } from '../components/SpeakButton';
import { buttonClass, EmptyState, hanziSizeClass, MixedText, PageLoader, TagChip } from '../components/ui';
import { WordImage } from '../components/WordImage';
import { db } from '../db/db';
import type { Word } from '../db/types';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { shuffle } from '../lib/random';
import { wordsWithAnyTag } from '../lib/tags';
import type { CardFront } from './FlashcardsSetupPage';

export function FlashcardsReviewPage() {
  useDocumentTitle('Thẻ ghi nhớ');
  const [params] = useSearchParams();
  const tagsKey = params.getAll('tag').join('\n');
  const front: CardFront = params.get('front') === 'meaning' ? 'meaning' : 'word';
  const shuffled = params.get('shuffle') !== '0';
  const [words, setWords] = useState<Word[] | null>(null);

  // Load the deck once rather than live, so cards don't shift around mid-session.
  useEffect(() => {
    let cancelled = false;
    const tags = tagsKey ? tagsKey.split('\n') : [];
    void db.words
      .orderBy('createdAt')
      .toArray()
      .then((all) => {
        if (!cancelled) setWords(tags.length > 0 ? wordsWithAnyTag(all, tags) : all);
      });
    return () => {
      cancelled = true;
    };
  }, [tagsKey]);

  if (!words) return <PageLoader />;
  if (words.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title="Không có thẻ nào để ôn"
        action={
          <Link to="/flashcards" className={buttonClass('primary')}>
            Chọn bộ thẻ
          </Link>
        }
      >
        Không có từ nào thuộc bộ thẻ này.
      </EmptyState>
    );
  }
  return <FlashcardSession words={words} front={front} shuffled={shuffled} />;
}

interface SessionProps {
  words: Word[];
  front: CardFront;
  shuffled: boolean;
}

function FlashcardSession({ words, front, shuffled }: SessionProps) {
  const order = useCallback((list: Word[]) => (shuffled ? shuffle(list) : list), [shuffled]);
  const [round, setRound] = useState(() => ({ id: 0, cards: order(words) }));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  /** results[i] is whether the user knew round.cards[i]. */
  const [results, setResults] = useState<boolean[]>([]);

  const { cards } = round;
  const finished = index >= cards.length;

  const flip = useCallback(() => setFlipped((f) => !f), []);
  const grade = useCallback(
    (knew: boolean) => {
      if (finished) return;
      setResults((r) => [...r.slice(0, index), knew]);
      setIndex(index + 1);
      setFlipped(false);
    },
    [finished, index],
  );
  const undo = useCallback(() => {
    if (index === 0) return;
    setResults((r) => r.slice(0, index - 1));
    setIndex(index - 1);
    setFlipped(false);
  }, [index]);

  const startRound = (list: Word[]) => {
    setRound((r) => ({ id: r.id + 1, cards: order(list) }));
    setIndex(0);
    setResults([]);
    setFlipped(false);
  };

  useEffect(() => {
    if (finished) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      switch (event.key) {
        case ' ':
        case 'Enter':
          // A focused button or link handles Space/Enter itself.
          if (target?.closest('button, a')) return;
          event.preventDefault();
          flip();
          break;
        case 'ArrowRight':
        case '2':
          event.preventDefault();
          grade(true);
          break;
        case 'ArrowLeft':
        case '1':
          event.preventDefault();
          grade(false);
          break;
        case 'z':
        case 'Z':
        case 'Backspace':
          event.preventDefault();
          undo();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finished, flip, grade, undo]);

  if (finished) {
    return (
      <RoundSummary
        cards={cards}
        results={results}
        totalWords={words.length}
        onReview={startRound}
        onRestart={() => startRound(words)}
      />
    );
  }

  const card = cards[index];
  const known = results.filter(Boolean).length;
  // Grade buttons shouldn't keep focus after a click, or Space would press them again instead of flipping.
  const keepFocus = (event: MouseEvent) => event.preventDefault();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/flashcards" className={buttonClass('ghost', 'sm', '-ml-2')}>
          <X /> Kết thúc
        </Link>
        <div className="flex items-center gap-4 text-sm tabular-nums">
          <span className="inline-flex items-center gap-1 text-good" title="Đã thuộc">
            <Check className="size-4" /> {known}
          </span>
          <span className="inline-flex items-center gap-1 text-accent-ink" title="Chưa thuộc">
            <RotateCcw className="size-4" /> {results.length - known}
          </span>
          <span className="font-semibold">
            {index + 1} / {cards.length}
          </span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Số thẻ đã ôn"
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={index}
        className="mb-6 h-1.5 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      {/* Keyed per card: a new card starts face down without animating, so the next answer never flashes past. */}
      <Flashcard key={`${round.id}-${index}`} word={card} front={front} flipped={flipped} onFlip={flip} />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onMouseDown={keepFocus} onClick={() => grade(false)} className={buttonClass('secondary', 'xl')}>
          <RotateCcw /> Chưa thuộc
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={() => grade(true)} className={buttonClass('success', 'xl')}>
          <Check /> Đã thuộc
        </button>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1">
        <button type="button" onMouseDown={keepFocus} onClick={undo} disabled={index === 0} className={buttonClass('ghost', 'sm')}>
          <Undo2 /> Hoàn tác
        </button>
        <SpeakButton text={card.word} showLabel />
      </div>
      <p className="mt-4 hidden text-center text-xs text-faint md:block">
        Phím cách: lật thẻ · ←: chưa thuộc · →: đã thuộc · Z: hoàn tác
      </p>
    </div>
  );
}

interface FlashcardProps {
  word: Word;
  front: CardFront;
  flipped: boolean;
  onFlip: () => void;
}

function Flashcard({ word, front, flipped, onFlip }: FlashcardProps) {
  const reading = word.reading && word.reading !== word.word ? word.reading : null;
  const chinese = (
    <p lang="zh-Hans" className={cn('font-zh leading-tight font-semibold break-words', hanziSizeClass(word.word))}>
      {word.word}
    </p>
  );

  return (
    <div className="flip-scene animate-rise">
      {/* Space/Enter are handled by the page-level shortcut listener. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Xem lại mặt trước' : 'Lật thẻ xem đáp án'}
        onClick={onFlip}
        data-flipped={flipped}
        className="flip-card cursor-pointer rounded-[2rem] select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <CardFace stamp="正" hidden={flipped}>
          {front === 'word' ? (
            chinese
          ) : (
            <>
              <WordImage imageId={word.imageId} alt="" className="max-h-44 rounded-2xl object-contain" />
              <p className="text-3xl font-semibold md:text-4xl">
                <MixedText>{word.meaning}</MixedText>
              </p>
            </>
          )}
          <p className="absolute inset-x-0 bottom-5 text-xs text-faint">
            {front === 'word' ? 'Từ này nghĩa là gì, đọc thế nào?' : 'Tiếng Trung nói thế nào?'} Nhấn để xem đáp án.
          </p>
        </CardFace>
        <CardFace stamp="反" back hidden={!flipped}>
          {reading && (
            <p lang="zh-Latn-pinyin" className="font-pinyin text-xl text-accent-ink md:text-2xl">
              {reading}
            </p>
          )}
          {chinese}
          <div className="my-1 h-px w-16 bg-line" />
          <p className="text-xl md:text-2xl">
            <MixedText>{word.meaning}</MixedText>
          </p>
          <WordImage imageId={word.imageId} alt="" className="max-h-36 rounded-xl object-contain" />
          {word.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {word.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          )}
        </CardFace>
      </div>
    </div>
  );
}

function CardFace({ stamp, back, hidden, children }: { stamp: string; back?: boolean; hidden: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={hidden}
      className={cn(
        'flip-face relative flex min-h-[21rem] flex-col items-center justify-center gap-3 rounded-[2rem] border border-line bg-card px-6 pt-12 pb-14 text-center shadow-[0_18px_50px_-22px_rgb(60_40_20/0.4)] md:min-h-[24rem]',
        back && 'flip-face-back',
      )}
    >
      {/* Like a seal stamped in red: 正 marks the front of the card, 反 the back. */}
      <span
        aria-hidden
        lang="zh-Hans"
        className="absolute top-5 left-5 grid size-8 -rotate-6 place-items-center rounded-md border-2 border-accent/35 font-zh text-sm font-semibold text-accent/60"
      >
        {stamp}
      </span>
      {children}
    </div>
  );
}

interface RoundSummaryProps {
  cards: Word[];
  results: boolean[];
  totalWords: number;
  onReview: (cards: Word[]) => void;
  onRestart: () => void;
}

function RoundSummary({ cards, results, totalWords, onReview, onRestart }: RoundSummaryProps) {
  const learning = cards.filter((_, i) => !results[i]);
  const known = cards.length - learning.length;
  const perfect = learning.length === 0;

  return (
    <div className="mx-auto max-w-xl animate-rise text-center">
      <div
        className={cn(
          'mx-auto mb-5 grid size-16 place-items-center rounded-2xl',
          perfect ? 'bg-good-soft text-good' : 'bg-accent-soft text-accent-ink',
        )}
      >
        {perfect ? <PartyPopper className="size-8" /> : <Layers className="size-8" />}
      </div>
      <p lang="zh-Hans" className="font-zh text-sm font-semibold text-accent-ink">
        {perfect ? '完美！' : '辛苦了！'}
      </p>
      <h1 className="text-3xl font-bold tracking-tight">{perfect ? 'Thuộc hết rồi!' : 'Xong một lượt!'}</h1>
      <p className="mt-2 text-muted">
        Bạn đã thuộc <strong className="text-ink">{known}</strong> trên {cards.length} thẻ.
      </p>
      <div className="mx-auto mt-5 flex h-2.5 max-w-xs overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div className="bg-good" style={{ width: `${(known / cards.length) * 100}%` }} />
        <div className="bg-accent/70" style={{ width: `${(learning.length / cards.length) * 100}%` }} />
      </div>

      {learning.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="mb-2 text-sm font-semibold text-muted">Chưa thuộc</h2>
          <ul className="flex flex-wrap gap-2">
            {learning.map((word) => (
              <li key={word.id} className="rounded-xl border border-line bg-card px-3 py-2 shadow-xs">
                <span lang="zh-Hans" className="font-zh text-lg font-semibold">
                  {word.word}
                </span>{' '}
                <span className="text-sm text-muted">
                  <MixedText>{word.meaning}</MixedText>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {learning.length > 0 && (
          <button type="button" onClick={() => onReview(learning)} className={buttonClass('primary', 'lg')}>
            <RotateCcw /> Ôn lại {learning.length} thẻ chưa thuộc
          </button>
        )}
        <button type="button" onClick={onRestart} className={buttonClass(perfect ? 'primary' : 'secondary', 'lg')}>
          <Repeat /> Ôn lại cả {totalWords} thẻ
        </button>
        <Link to="/flashcards" className={buttonClass('ghost', 'lg')}>
          Chọn bộ thẻ khác
        </Link>
      </div>
    </div>
  );
}
