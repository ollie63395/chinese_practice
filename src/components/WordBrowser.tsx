import { ListChecks, Trash2, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useTagCounts } from '../db/hooks';
import type { Word } from '../db/types';
import { cn } from '../lib/cn';
import { foldPinyin, matchesSearch } from '../lib/search';
import { formatDay, formatTime } from '../lib/time';
import { importBatches } from '../lib/wordBatches';
import { useConfirm } from './feedback';
import { buttonClass, FloatingBar, MixedText, SearchInput, selectClass } from './ui';
import { WordCard } from './WordCard';

const SORTS = {
  newest: 'Mới nhất',
  oldest: 'Cũ nhất',
  pinyin: 'Pinyin A–Z',
} as const;
type Sort = keyof typeof SORTS;

/** How many recent imports are offered for choosing all at once. */
const SHOWN_BATCHES = 8;

function sortWords(words: Word[], sort: Sort): Word[] {
  // `words` arrive newest first.
  if (sort === 'oldest') return words.slice().reverse();
  if (sort === 'pinyin') {
    return words.slice().sort((a, b) => foldPinyin(a.reading).localeCompare(foldPinyin(b.reading), 'en'));
  }
  return words;
}

/** The words named in a confirmation: a few of them, then how many more. */
function someOf(words: readonly Word[]): string {
  const shown = words.slice(0, 5).map((w) => w.word);
  const more = words.length - shown.length;
  return shown.join(', ') + (more > 0 ? ` và ${more} từ khác` : '');
}

interface WordBrowserProps {
  words: Word[];
  /** For a teacher looking at a student's words. */
  readOnly?: boolean;
  /** Offers choosing several words to delete, called once that's confirmed. Resolves to whether they were all deleted. */
  onDeleteMany?: (words: Word[]) => Promise<boolean>;
  /** Called when choosing several words begins. */
  onStartSelecting?: () => void;
}

/** Search, tag filters, sorting and the grid of word cards. */
export function WordBrowser({ words, readOnly, onDeleteMany, onStartSelecting }: WordBrowserProps) {
  const tags = useTagCounts(words);
  const confirm = useConfirm();
  // Filters live in the URL so they survive going to a word and coming back.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const tag = params.get('tag');
  const sortParam = params.get('sort');
  const sort: Sort = sortParam && sortParam in SORTS ? (sortParam as Sort) : 'newest';

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const visible = useMemo(
    () => sortWords(words.filter((w) => (!tag || w.tags.includes(tag)) && matchesSearch(w, query)), sort),
    [words, tag, query, sort],
  );

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  // Worked out from the words, so one deleted elsewhere in the meantime no longer counts.
  const selectedWords = useMemo(() => words.filter((w) => selected.has(w.id)), [words, selected]);
  const batches = useMemo(() => (selecting ? importBatches(words).slice(0, SHOWN_BATCHES) : []), [selecting, words]);
  const allVisibleSelected = visible.length > 0 && visible.every((w) => selected.has(w.id));
  const hiddenCount = selectedWords.length - visible.filter((w) => selected.has(w.id)).length;

  const setChosen = (chosen: readonly Word[], on: boolean) => {
    const next = new Set(selected);
    for (const word of chosen) {
      if (on) next.add(word.id);
      else next.delete(word.id);
    }
    setSelected(next);
  };
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const deleteSelected = async () => {
    if (!onDeleteMany) return;
    const ok = await confirm({
      title: `Xóa ${selectedWords.length} từ?`,
      message: (
        <>
          <p className="break-words">
            <MixedText>{someOf(selectedWords)}</MixedText>
          </p>
          <p className="mt-2">
            {selectedWords.length === words.length && <strong className="text-ink">Đây là toàn bộ kho từ vựng của bạn. </strong>}
            Các từ này và hình ảnh của chúng sẽ bị xóa khỏi kho từ vựng; lịch sử luyện tập vẫn giữ bản ghi riêng. Bạn có thể hoàn
            tác ngay sau khi xóa.
          </p>
        </>
      ),
      confirmLabel: `Xóa ${selectedWords.length} từ`,
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    const done = await onDeleteMany(selectedWords);
    setDeleting(false);
    if (done) stopSelecting();
  };

  return (
    <>
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={query}
            onChange={(q) => update({ q: q || null })}
            label="Tìm từ"
            placeholder="Tìm theo chữ Hán, pinyin hoặc nghĩa"
          />
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(event) => update({ sort: event.target.value === 'newest' ? null : event.target.value })}
              aria-label="Sắp xếp từ"
              className={cn(selectClass, 'min-w-0 flex-1 sm:flex-none')}
            >
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {onDeleteMany && !readOnly && !selecting && (
              <button
                type="button"
                onClick={() => {
                  onStartSelecting?.();
                  setSelecting(true);
                }}
                className={buttonClass('secondary', 'md', 'self-center')}
              >
                <ListChecks /> Chọn nhiều
              </button>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip active={!tag} onClick={() => update({ tag: null })}>
              Tất cả <span className="opacity-70">{words.length}</span>
            </FilterChip>
            {tags.map((t) => (
              <FilterChip key={t.tag} active={tag === t.tag} onClick={() => update({ tag: tag === t.tag ? null : t.tag })}>
                <MixedText>{t.tag}</MixedText> <span className="opacity-70">{t.count}</span>
              </FilterChip>
            ))}
          </div>
        )}

        {batches.length > 0 && (
          <div role="group" aria-label="Chọn cả một lần nhập" className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <span className="shrink-0 text-sm text-muted">Chọn cả lần nhập:</span>
            {batches.map((batch) => {
              const all = batch.words.every((w) => selected.has(w.id));
              return (
                <FilterChip key={batch.time} active={all} onClick={() => setChosen(batch.words, !all)}>
                  {formatDay(batch.time)}, {formatTime(batch.time)} <span className="opacity-70">{batch.words.length} từ</span>
                </FilterChip>
              );
            })}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-12 text-center text-muted">
          <p>
            <MixedText>{`Không có từ nào khớp${query ? ` với “${query}”` : ''}${tag ? ` trong nhãn “${tag}”` : ''}.`}</MixedText>
          </p>
          <button type="button" onClick={() => update({ q: null, tag: null })} className={buttonClass('ghost', 'sm', 'mt-3')}>
            <X /> Xóa bộ lọc
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              readOnly={readOnly}
              selection={
                selecting ? { selected: selected.has(word.id), onToggle: () => setChosen([word], !selected.has(word.id)) } : undefined
              }
            />
          ))}
        </ul>
      )}

      {selecting && (
        <>
          {/* Room to scroll the last cards clear of the bar. */}
          <div className="h-24" />
          <FloatingBar>
            <p className="w-full text-sm font-medium sm:mr-auto sm:w-auto" role="status">
              Đã chọn {selectedWords.length} từ
              {hiddenCount > 0 && <span className="font-normal text-muted"> ({hiddenCount} từ bị bộ lọc ẩn)</span>}
            </p>
            <button type="button" onClick={stopSelecting} className={buttonClass('ghost', 'sm')}>
              Hủy
            </button>
            <button
              type="button"
              disabled={visible.length === 0}
              onClick={() => setChosen(visible, !allVisibleSelected)}
              className={buttonClass('secondary', 'sm')}
            >
              {allVisibleSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${visible.length})`}
            </button>
            <button
              type="button"
              disabled={selectedWords.length === 0 || deleting}
              onClick={() => void deleteSelected()}
              className={buttonClass('danger-solid', 'sm', 'ml-auto sm:ml-0')}
            >
              <Trash2 /> {deleting ? 'Đang xóa…' : `Xóa ${selectedWords.length} từ`}
            </button>
          </FloatingBar>
        </>
      )}
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
        active ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
