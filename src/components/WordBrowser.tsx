import { X } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useTagCounts } from '../db/hooks';
import type { Word } from '../db/types';
import { cn } from '../lib/cn';
import { foldPinyin, matchesSearch } from '../lib/search';
import { buttonClass, MixedText, SearchInput, selectClass } from './ui';
import { WordCard } from './WordCard';

const SORTS = {
  newest: 'Mới nhất',
  oldest: 'Cũ nhất',
  pinyin: 'Pinyin A–Z',
} as const;
type Sort = keyof typeof SORTS;

function sortWords(words: Word[], sort: Sort): Word[] {
  // `words` arrive newest first.
  if (sort === 'oldest') return words.slice().reverse();
  if (sort === 'pinyin') {
    return words.slice().sort((a, b) => foldPinyin(a.reading).localeCompare(foldPinyin(b.reading), 'en'));
  }
  return words;
}

interface WordBrowserProps {
  words: Word[];
  /** For a teacher looking at a student's words. */
  readOnly?: boolean;
}

/** Search, tag filters, sorting and the grid of word cards. */
export function WordBrowser({ words, readOnly }: WordBrowserProps) {
  const tags = useTagCounts(words);
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
          <select
            value={sort}
            onChange={(event) => update({ sort: event.target.value === 'newest' ? null : event.target.value })}
            aria-label="Sắp xếp từ"
            className={selectClass}
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
            <WordCard key={word.id} word={word} readOnly={readOnly} />
          ))}
        </ul>
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
