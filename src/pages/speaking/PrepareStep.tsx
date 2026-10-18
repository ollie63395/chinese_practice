import { ArrowLeft, Dices, Play, Plus, RefreshCw, Shuffle, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DurationInput, MIN_SPEECH_SECONDS } from '../../components/NumberInputs';
import { SpeakButton } from '../../components/SpeakButton';
import { buttonClass, hanziSizeClass, inputClass, MixedText, PageHeader, panelClass, SearchInput } from '../../components/ui';
import { WordImage } from '../../components/WordImage';
import type { Word } from '../../db/types';
import { cn } from '../../lib/cn';
import { pickRandom } from '../../lib/random';
import { matchesSearch } from '../../lib/search';
import { formatClock } from '../../lib/time';

interface PrepareStepProps {
  chosen: Word[];
  onChosenChange: (words: Word[]) => void;
  /** Where random words come from (all words, or the chosen tags). */
  pool: Word[];
  /** Every word, for adding one by hand. */
  allWords: Word[];
  notes: string;
  onNotesChange: (notes: string) => void;
  timeLimitSec: number;
  onTimeLimitChange: (seconds: number) => void;
  onRedraw: () => void;
  onBack: () => void;
  onStart: () => void;
}

export function PrepareStep(props: PrepareStepProps) {
  const { chosen, onChosenChange, pool, allWords, notes, onNotesChange, timeLimitSec, onTimeLimitChange } = props;
  const [picking, setPicking] = useState(false);
  const chosenIds = useMemo(() => new Set(chosen.map((w) => w.id)), [chosen]);
  const spare = pool.filter((w) => !chosenIds.has(w.id));

  const swap = (id: string) => {
    const replacement = pickRandom(spare);
    if (replacement) onChosenChange(chosen.map((w) => (w.id === id ? replacement : w)));
  };
  const addRandom = () => {
    const extra = pickRandom(spare);
    if (extra) onChosenChange([...chosen, extra]);
  };

  return (
    <>
      <button
        type="button"
        onClick={props.onBack}
        className="mb-3 -ml-1 inline-flex cursor-pointer items-center gap-1 rounded-lg px-1 py-0.5 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Cài đặt
      </button>
      <PageHeader
        zh="准备"
        title="Chuẩn bị bài nói"
        description="Lên ý cho một bài nói ngắn hoặc một câu chuyện có dùng các từ này. Cứ thong thả: đồng hồ chỉ chạy khi bạn nhấn Bắt đầu."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* min-w-0: on phones the single grid column would otherwise widen to fit an untruncated meaning. */}
        <section aria-labelledby="chosen-heading" className="min-w-0">
          <h2 id="chosen-heading" className="mb-3 font-semibold">
            Các từ của bạn <span className="font-normal text-muted">({chosen.length})</span>
          </h2>
          {chosen.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">
              Chưa có từ nào. Hãy thêm từ ở bên dưới.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {chosen.map((word) => (
                <PrepWord
                  key={word.id}
                  word={word}
                  canSwap={spare.length > 0}
                  onSwap={() => swap(word.id)}
                  onRemove={() => onChosenChange(chosen.filter((w) => w.id !== word.id))}
                />
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-expanded={picking}
              onClick={() => setPicking((p) => !p)}
              className={buttonClass('secondary', 'sm')}
            >
              <Plus /> Thêm một từ
            </button>
            <button type="button" onClick={addRandom} disabled={spare.length === 0} className={buttonClass('secondary', 'sm')}>
              <Dices /> Thêm một từ ngẫu nhiên
            </button>
            <button type="button" onClick={props.onRedraw} disabled={pool.length === 0} className={buttonClass('ghost', 'sm')}>
              <RefreshCw /> Bốc lại tất cả
            </button>
          </div>
          {picking && (
            <WordPicker
              words={allWords}
              excludeIds={chosenIds}
              onPick={(word) => onChosenChange([...chosen, word])}
              onClose={() => setPicking(false)}
            />
          )}
        </section>

        <aside className={cn(panelClass, 'h-fit space-y-6 p-5 lg:sticky lg:top-20')}>
          <div>
            <label htmlFor="notes" className="text-sm font-semibold">
              Ý tưởng &amp; ghi chú <span className="font-normal text-faint">không bắt buộc</span>
            </label>
            <textarea
              id="notes"
              rows={5}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Ghi lại mạch truyện, cụm từ hay ngữ pháp bạn muốn thử…"
              className={cn(inputClass, 'mt-1.5 resize-y')}
            />
            <p className="mt-1 text-xs text-muted">Bạn sẽ thấy ghi chú này khi nói, và nó được lưu cùng buổi luyện.</p>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold">Thời gian nói</h2>
            <DurationInput idPrefix="prep-time" seconds={timeLimitSec} onChange={onTimeLimitChange} />
          </div>
          <button
            type="button"
            onClick={props.onStart}
            disabled={chosen.length === 0 || timeLimitSec < MIN_SPEECH_SECONDS}
            className={buttonClass('primary', 'lg', 'w-full')}
          >
            <Play /> Bắt đầu nói · {formatClock(timeLimitSec)}
          </button>
        </aside>
      </div>
    </>
  );
}

interface PrepWordProps {
  word: Word;
  canSwap: boolean;
  onSwap: () => void;
  onRemove: () => void;
}

function PrepWord({ word, canSwap, onSwap, onRemove }: PrepWordProps) {
  return (
    <li className="flex animate-rise gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs">
      <WordImage imageId={word.imageId} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p lang="zh-Hans" className={cn('font-zh leading-tight font-semibold break-words', hanziSizeClass(word.word, 'tile'))}>
          {word.word}
        </p>
        {word.reading !== word.word && (
          <p lang="zh-Latn-pinyin" className="font-pinyin text-sm text-accent-ink">
            {word.reading}
          </p>
        )}
        <p className="mt-0.5 text-sm text-muted">
          <MixedText>{word.meaning}</MixedText>
        </p>
      </div>
      <div className="-mt-2 -mr-2 flex shrink-0 items-start">
        <SpeakButton text={word.word} />
        <button
          type="button"
          title="Đổi từ khác"
          aria-label={`Đổi ${word.word} sang một từ ngẫu nhiên khác`}
          onClick={onSwap}
          disabled={!canSwap}
          className={buttonClass('ghost', 'icon')}
        >
          <Shuffle />
        </button>
        <button type="button" title="Bỏ từ này" aria-label={`Bỏ ${word.word}`} onClick={onRemove} className={buttonClass('ghost', 'icon')}>
          <X />
        </button>
      </div>
    </li>
  );
}

interface WordPickerProps {
  words: Word[];
  excludeIds: Set<string>;
  onPick: (word: Word) => void;
  onClose: () => void;
}

function WordPicker({ words, excludeIds, onPick, onClose }: WordPickerProps) {
  const [query, setQuery] = useState('');
  const available = words.filter((w) => !excludeIds.has(w.id));
  const matches = available.filter((w) => matchesSearch(w, query)).slice(0, 8);

  return (
    <div
      className="mt-3 animate-rise rounded-2xl border border-line bg-card p-3 shadow-md"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Tìm từ để thêm vào"
          placeholder="Tìm trong kho từ của bạn"
          autoFocus
        />
        <button type="button" onClick={onClose} className={buttonClass('ghost')}>
          Xong
        </button>
      </div>
      {matches.length > 0 ? (
        <ul aria-label="Các từ phù hợp" className="mt-2 max-h-72 overflow-y-auto">
          {matches.map((word) => (
            <li key={word.id}>
              <button
                type="button"
                onClick={() => onPick(word)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-sunken"
              >
                <span lang="zh-Hans" className="font-zh text-lg font-semibold">
                  {word.word}
                </span>
                {word.reading !== word.word && (
                  <span lang="zh-Latn-pinyin" className="font-pinyin text-sm text-accent-ink">
                    {word.reading}
                  </span>
                )}
                {/* The padding gives stacked marks on capitals (Ấ, Ổ) room inside the clipped box. */}
                <span className="min-w-0 flex-1 truncate py-1 text-sm text-muted">
                  <MixedText>{word.meaning}</MixedText>
                </span>
                <Plus className="size-4 shrink-0 text-faint" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-4 text-center text-sm text-muted">
          {available.length === 0 ? 'Tất cả các từ của bạn đã có trong buổi luyện này.' : 'Không có từ nào phù hợp.'}
        </p>
      )}
    </div>
  );
}
