import { Layers, Library, Play, Plus, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { TagPicker } from '../components/TagPicker';
import { buttonClass, EmptyState, PageHeader, PageLoader, panelClass, Segmented } from '../components/ui';
import { useTagCounts, useWords } from '../db/hooks';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { isRecord, stringArray, useRememberedState } from '../lib/prefs';
import { wordsWithAnyTag } from '../lib/tags';

export type CardFront = 'word' | 'meaning';

interface FlashcardPrefs {
  deck: 'all' | 'tags';
  tags: string[];
  front: CardFront;
  shuffle: boolean;
}

function sanitizePrefs(stored: unknown): FlashcardPrefs {
  const s = isRecord(stored) ? stored : {};
  return {
    deck: s.deck === 'tags' ? 'tags' : 'all',
    tags: stringArray(s.tags),
    front: s.front === 'meaning' ? 'meaning' : 'word',
    shuffle: s.shuffle !== false,
  };
}

export function FlashcardsSetupPage() {
  useDocumentTitle('Thẻ ghi nhớ');
  const navigate = useNavigate();
  const words = useWords();
  const tagCounts = useTagCounts(words);
  const [prefs, setPrefs] = useRememberedState('flashcards', sanitizePrefs);

  if (!words) return <PageLoader />;

  const header = (
    <PageHeader
      zh="词卡"
      title="Thẻ ghi nhớ"
      description="Ôn từ vựng qua từng thẻ một. Chọn cả kho từ, hoặc chỉ những nhãn bạn muốn tập trung."
    />
  );

  if (words.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Layers />}
          title="Chưa có thẻ nào"
          action={
            <Link to="/words/new" className={buttonClass('primary')}>
              <Plus /> Thêm từ
            </Link>
          }
        >
          Mỗi từ bạn thêm sẽ trở thành một thẻ ghi nhớ.
        </EmptyState>
      </>
    );
  }

  // Remembered tags may have since been deleted or renamed.
  const selectedTags = prefs.tags.filter((tag) => tagCounts.some((t) => t.tag === tag));
  const deck = prefs.deck === 'tags' && tagCounts.length > 0 ? 'tags' : 'all';
  const deckSize = deck === 'all' ? words.length : wordsWithAnyTag(words, selectedTags).length;

  const start = () => {
    const params = new URLSearchParams();
    if (deck === 'tags') for (const tag of selectedTags) params.append('tag', tag);
    if (prefs.front === 'meaning') params.set('front', 'meaning');
    if (!prefs.shuffle) params.set('shuffle', '0');
    void navigate(`/flashcards/review?${params}`);
  };

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="deck-heading" className="space-y-3">
          <h2 id="deck-heading" className="text-sm font-semibold text-muted">
            Bạn muốn ôn gì?
          </h2>
          <DeckOption
            checked={deck === 'all'}
            onSelect={() => setPrefs((p) => ({ ...p, deck: 'all' }))}
            icon={<Library />}
            title="Tất cả các từ"
            meta={`${words.length} thẻ`}
            description="Mọi từ trong kho của bạn."
          />
          <DeckOption
            checked={deck === 'tags'}
            disabled={tagCounts.length === 0}
            onSelect={() => setPrefs((p) => ({ ...p, deck: 'tags' }))}
            icon={<Tags />}
            title="Theo nhãn"
            meta={deck === 'tags' ? `${deckSize} thẻ` : `${tagCounts.length} nhãn`}
            description={
              tagCounts.length > 0
                ? 'Chọn một hoặc nhiều nhãn. Từ nào có ít nhất một nhãn đã chọn sẽ được đưa vào.'
                : 'Bạn chưa gắn nhãn cho từ nào. Hãy thêm nhãn khi thêm hoặc sửa từ.'
            }
          >
            {deck === 'tags' && (
              <TagPicker tags={tagCounts} selected={selectedTags} onChange={(tags) => setPrefs((p) => ({ ...p, tags }))} />
            )}
          </DeckOption>
        </section>

        <aside className={cn(panelClass, 'h-fit space-y-6 p-5 lg:sticky lg:top-20')}>
          <div>
            <h2 className="mb-2 text-sm font-semibold">Mặt trước</h2>
            <Segmented
              label="Mặt trước"
              value={prefs.front}
              onChange={(front) => setPrefs((p) => ({ ...p, front }))}
              options={[
                { value: 'word', label: 'Tiếng Trung' },
                { value: 'meaning', label: 'Nghĩa' },
              ]}
            />
            <p className="mt-2 text-xs text-muted">
              {prefs.front === 'word'
                ? 'Nhìn chữ Hán, rồi nhớ lại pinyin và nghĩa.'
                : 'Nhìn nghĩa và hình ảnh, rồi nhớ lại từ tiếng Trung.'}
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold">Xáo trộn thẻ</span>
              <span className="block text-xs text-muted">Nếu tắt, những từ cũ nhất sẽ hiện trước.</span>
            </span>
            <Switch checked={prefs.shuffle} onChange={(shuffle) => setPrefs((p) => ({ ...p, shuffle }))} />
          </label>
          <div>
            <button type="button" onClick={start} disabled={deckSize === 0} className={buttonClass('primary', 'lg', 'w-full')}>
              <Play /> Bắt đầu · {deckSize} thẻ
            </button>
            {deck === 'tags' && selectedTags.length === 0 && (
              <p className="mt-2 text-center text-xs text-muted">Hãy chọn ít nhất một nhãn để bắt đầu.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

interface DeckOptionProps {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  meta: string;
  description: string;
  children?: ReactNode;
}

function DeckOption({ checked, disabled, onSelect, icon, title, meta, description, children }: DeckOptionProps) {
  return (
    <div
      className={cn(
        panelClass,
        'rounded-2xl transition has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent',
        checked ? 'border-accent/60 ring-3 ring-accent/10' : disabled ? 'opacity-60' : 'hover:border-ink/20',
      )}
    >
      <label className={cn('flex items-start gap-4 p-5', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
        <input type="radio" name="deck" checked={checked} disabled={disabled} onChange={onSelect} className="sr-only" />
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl transition [&_svg]:size-5',
            checked ? 'bg-accent text-on-accent' : 'bg-sunken text-muted',
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-muted tabular-nums">{meta}</span>
          </span>
          <span className="mt-0.5 block text-sm text-muted">{description}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            'mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 transition',
            checked ? 'border-accent' : 'border-line',
          )}
        >
          {checked && <span className="size-2.5 rounded-full bg-accent" />}
        </span>
      </label>
      {children && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
      <span
        aria-hidden
        className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"
      />
    </span>
  );
}
