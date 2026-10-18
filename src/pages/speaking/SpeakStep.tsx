import { Check, ChevronDown, Flag, Pause, Play } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { buttonClass, hanziSizeClass, MixedText, panelClass } from '../../components/ui';
import type { Word } from '../../db/types';
import { cn } from '../../lib/cn';
import { useWakeLock } from '../../lib/hooks';
import { playChime } from '../../lib/sound';
import { formatClock } from '../../lib/time';

export interface SpeechResult {
  spokenSec: number;
  endedEarly: boolean;
  usedIds: string[];
}

interface SpeakStepProps {
  words: Word[];
  notes: string;
  timeLimitSec: number;
  onFinish: (result: SpeechResult) => void;
}

export function SpeakStep({ words, notes, timeLimitSec, onFinish }: SpeakStepProps) {
  const limitMs = timeLimitSec * 1000;
  // Time is measured from the clock rather than by counting ticks, so it stays right
  // even when the browser throttles timers (e.g. the tab is in the background).
  const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [used, setUsed] = useState<ReadonlySet<string>>(() => new Set());
  const [notesOpen, setNotesOpen] = useState(true);
  const ended = useRef(false);
  useWakeLock(true);

  const paused = runningSince === null;
  const elapsedAt = (time: number) => elapsedBeforePause + (runningSince === null ? 0 : Math.max(0, time - runningSince));
  const remainingMs = Math.max(0, limitMs - elapsedAt(now));

  useEffect(() => {
    if (runningSince === null) return;
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [runningSince]);

  const end = (endedEarly: boolean) => {
    if (ended.current) return;
    ended.current = true;
    if (!endedEarly) {
      playChime();
      navigator.vibrate?.([180, 80, 180]);
    }
    const spokenMs = endedEarly ? Math.min(limitMs, elapsedAt(Date.now())) : limitMs;
    onFinish({ spokenSec: Math.round(spokenMs / 1000), endedEarly, usedIds: [...used] });
  };

  const onTimeUp = useEffectEvent(() => end(false));
  useEffect(() => {
    if (remainingMs <= 0) onTimeUp();
  }, [remainingMs]);

  const pause = () => {
    const time = Date.now();
    setElapsedBeforePause(elapsedAt(time));
    setRunningSince(null);
    setNow(time);
  };
  const resume = () => {
    const time = Date.now();
    setRunningSince(time);
    setNow(time);
  };
  const toggleUsed = (id: string) =>
    setUsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center">
        <p lang="zh-Hans" className="font-zh text-sm font-semibold text-accent-ink">
          {paused ? '已暂停' : '说话中'}
        </p>
        <h1 className="sr-only">Đang nói</h1>
        <TimerRing remainingMs={remainingMs} totalMs={limitMs} paused={paused} />
        <div className="mt-3 flex gap-3 md:mt-5">
          {paused ? (
            <button type="button" onClick={resume} className={buttonClass('secondary', 'lg')}>
              <Play /> Tiếp tục
            </button>
          ) : (
            <button type="button" onClick={pause} className={buttonClass('secondary', 'lg')}>
              <Pause /> Tạm dừng
            </button>
          )}
          <button type="button" onClick={() => end(true)} className={buttonClass('primary', 'lg')}>
            <Flag /> Kết thúc
          </button>
        </div>
      </div>

      <section aria-labelledby="speech-words" className="mt-6 md:mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="speech-words" className="font-semibold">
            Các từ của bạn
          </h2>
          <p className="text-sm text-muted">
            Nhấn vào từ sau khi đã dùng · {used.size}/{words.length}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {words.map((word) => {
            const isUsed = used.has(word.id);
            return (
              <li key={word.id}>
                <button
                  type="button"
                  aria-pressed={isUsed}
                  onClick={() => toggleUsed(word.id)}
                  className={cn(
                    'flex h-full w-full cursor-pointer flex-col rounded-2xl border p-3.5 text-left transition',
                    isUsed ? 'border-good/50 bg-good-soft' : 'border-line bg-card shadow-xs hover:border-ink/25',
                  )}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span lang="zh-Hans" className={cn('font-zh leading-tight font-semibold break-words', hanziSizeClass(word.word, 'tile'))}>
                      {word.word}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border transition',
                        isUsed ? 'border-good bg-good text-card' : 'border-line text-transparent',
                      )}
                    >
                      <Check className="size-4" />
                    </span>
                  </span>
                  {word.reading !== word.word && (
                    <span lang="zh-Latn-pinyin" className="font-pinyin text-sm text-accent-ink">
                      {word.reading}
                    </span>
                  )}
                  {/* Padding rather than margin above: the clipped box needs room for stacked marks on capitals (Ấ, Ổ). */}
                  <span className="line-clamp-2 pt-0.5 text-sm text-muted">
                    <MixedText>{word.meaning}</MixedText>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {notes.trim() && (
        <section className={cn(panelClass, 'mt-6 rounded-2xl px-4 py-3')}>
          <button
            type="button"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between py-1 text-sm font-semibold"
          >
            Ghi chú của bạn
            <ChevronDown className={cn('size-4 transition', notesOpen && 'rotate-180')} />
          </button>
          {notesOpen && (
            <p className="mt-2 pb-1 whitespace-pre-wrap text-muted">
              <MixedText>{notes}</MixedText>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

interface TimerRingProps {
  remainingMs: number;
  totalMs: number;
  paused: boolean;
}

function TimerRing({ remainingMs, totalMs, paused }: TimerRingProps) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = !paused && seconds <= 10;

  return (
    // Smaller on phones so the clock and the words fit on one screen.
    <div role="timer" aria-label={`Còn ${formatClock(seconds)}`} className="relative my-3 aspect-square w-48 max-w-full md:my-4 md:w-64">
      <svg viewBox="0 0 200 200" className={cn('size-full -rotate-90 transition-opacity', paused && 'opacity-50')} aria-hidden>
        <circle cx="100" cy="100" r={radius} fill="none" strokeWidth="9" className="stroke-sunken" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn('transition-[stroke-dashoffset,stroke] duration-200 ease-linear', urgent ? 'stroke-accent' : 'stroke-ink')}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center" aria-hidden>
        <div>
          <div className={cn('text-5xl font-semibold tracking-tight tabular-nums md:text-6xl', urgent && 'animate-pulse-soft text-accent-ink')}>
            {formatClock(seconds)}
          </div>
          <div className="mt-1 text-sm text-muted">{paused ? 'Đã tạm dừng' : `trên ${formatClock(totalMs / 1000)}`}</div>
        </div>
      </div>
    </div>
  );
}
