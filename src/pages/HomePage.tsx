import { ArrowRight, Layers, Mic, Plus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonClass, PageLoader, panelClass } from '../components/ui';
import { WordCard } from '../components/WordCard';
import { usePractices, useTagCounts, useWords } from '../db/hooks';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { formatDuration } from '../lib/time';

export function HomePage() {
  useDocumentTitle('');
  const words = useWords();
  const practices = usePractices();
  const tags = useTagCounts(words);

  if (!words || !practices) return <PageLoader />;

  const spokenSec = practices.reduce((total, p) => total + p.spokenSec, 0);

  return (
    <div className="space-y-8 md:space-y-10">
      <section className={cn(panelClass, 'relative overflow-hidden p-6 md:p-10')}>
        <span
          aria-hidden
          lang="zh-Hans"
          className="pointer-events-none absolute -top-6 -right-3 font-zh text-[8rem] leading-none font-semibold text-accent/[0.07] select-none md:text-[12rem]"
        >
          词汇
        </span>
        <p lang="zh-Hans" className="relative font-zh text-sm font-semibold text-accent-ink">
          词汇 · Cíhuì
        </p>
        <h1 className="relative mt-2 text-3xl font-bold tracking-tight md:text-4xl">Kho từ vựng tiếng Trung của bạn</h1>
        <p className="relative mt-3 max-w-prose text-muted">
          Thêm những từ bạn vừa học, rồi ôn lại bằng thẻ ghi nhớ hoặc vận dụng chúng trong thử thách luyện nói có
          bấm giờ.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link to="/words/new" className={buttonClass('primary', 'lg')}>
            <Plus /> Thêm từ
          </Link>
          {words.length > 0 && (
            <Link to="/words" className={buttonClass('secondary', 'lg')}>
              Xem {words.length} từ
            </Link>
          )}
        </div>
      </section>

      <section aria-label="Tiến độ của bạn" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Từ vựng" value={words.length} />
        <Stat label="Nhãn" value={tags.length} />
        <Stat label="Buổi luyện nói" value={practices.length} />
        <Stat label="Thời gian đã nói" value={formatDuration(spokenSec)} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ModeCard
          to="/flashcards"
          icon={Layers}
          zh="词卡"
          title="Thẻ ghi nhớ"
          description="Lật qua tất cả các từ, hoặc chỉ những nhãn bạn chọn, và theo dõi những từ bạn đã thuộc."
        />
        <ModeCard
          to="/speaking"
          icon={Mic}
          zh="口语练习"
          title="Luyện nói"
          description="Bốc vài từ ngẫu nhiên, chuẩn bị bao lâu tùy thích, rồi nói trong thời gian giới hạn."
        />
      </section>

      {words.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Mới thêm gần đây</h2>
            <Link to="/words" className="text-sm font-medium text-accent-ink hover:underline">
              Xem tất cả
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {words.slice(0, 6).map((word) => (
              <WordCard key={word.id} word={word} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={cn(panelClass, 'rounded-2xl px-4 py-3.5')}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

interface ModeCardProps {
  to: string;
  icon: LucideIcon;
  zh: string;
  title: string;
  description: string;
}

function ModeCard({ to, icon: Icon, zh, title, description }: ModeCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        panelClass,
        'group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md md:p-6',
      )}
    >
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p lang="zh-Hans" className="font-zh text-xs font-semibold text-accent-ink">
          {zh}
        </p>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <ArrowRight className="mt-1 size-5 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-accent-ink" />
    </Link>
  );
}
