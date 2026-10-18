import { ChevronRight, History, Mic, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { buttonClass, EmptyState, PageHeader, PageLoader } from '../components/ui';
import { usePractices } from '../db/hooks';
import { deletePractice } from '../db/practices';
import type { PracticeLog } from '../db/types';
import { useDocumentTitle } from '../lib/hooks';
import { formatClock, formatDay, formatDuration, formatTime, startOfDay } from '../lib/time';

function groupByDay(logs: PracticeLog[]): { day: number; logs: PracticeLog[] }[] {
  const groups: { day: number; logs: PracticeLog[] }[] = [];
  for (const log of logs) {
    const day = startOfDay(log.startedAt);
    const last = groups.at(-1);
    if (last?.day === day) last.logs.push(log);
    else groups.push({ day, logs: [log] });
  }
  return groups;
}

export function HistoryPage() {
  useDocumentTitle('Lịch sử luyện tập');
  const practices = usePractices();
  const confirm = useConfirm();
  const toast = useToast();

  if (!practices) return <PageLoader />;

  const header = (
    <PageHeader
      zh="练习记录"
      title="Lịch sử luyện tập"
      description={
        practices.length > 0
          ? `${practices.length} buổi luyện nói, tổng thời gian nói ${formatDuration(practices.reduce((t, p) => t + p.spokenSec, 0))}.`
          : undefined
      }
    />
  );

  if (practices.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<History />}
          title="Chưa có buổi luyện tập nào"
          action={
            <Link to="/speaking" className={buttonClass('primary')}>
              <Mic /> Bắt đầu luyện nói
            </Link>
          }
        >
          Mỗi buổi luyện nói bạn hoàn thành sẽ được ghi lại ở đây, cùng với các từ bạn đã dùng.
        </EmptyState>
      </>
    );
  }

  const remove = async (log: PracticeLog) => {
    const ok = await confirm({
      title: 'Xóa buổi luyện tập này?',
      message: `Buổi luyện tập ${formatDay(log.startedAt).toLowerCase()} lúc ${formatTime(log.startedAt)} sẽ bị xóa khỏi lịch sử. Từ vựng của bạn không bị ảnh hưởng.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    await deletePractice(log.id);
    toast('Đã xóa buổi luyện tập');
  };

  return (
    <>
      {header}
      <div className="space-y-8">
        {groupByDay(practices).map((group) => (
          <section key={group.day} aria-label={formatDay(group.day)}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{formatDay(group.day)}</h2>
            <ul className="space-y-2">
              {group.logs.map((log) => (
                <HistoryRow key={log.id} log={log} onDelete={() => void remove(log)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function HistoryRow({ log, onDelete }: { log: PracticeLog; onDelete: () => void }) {
  const shown = log.words.slice(0, 6);
  const usedCount = log.words.filter((w) => w.used).length;
  return (
    <li className="group relative flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs transition hover:border-accent/30">
      <div className="min-w-0 flex-1">
        <Link
          to={`/history/${log.id}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
        >
          <span className="font-semibold">{formatTime(log.startedAt)}</span>
          <span className="text-muted">
            · đã nói {formatClock(log.spokenSec)} / {formatClock(log.timeLimitSec)}
          </span>
          <span className="text-muted">
            · {log.words.length} từ
            {usedCount > 0 && `, đã dùng ${usedCount}`}
          </span>
        </Link>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((word) => (
            <span key={word.id} lang="zh-Hans" className="rounded-lg bg-sunken px-2 py-0.5 font-zh text-base font-semibold">
              {word.word}
            </span>
          ))}
          {log.words.length > shown.length && (
            <span className="px-1 py-0.5 text-sm text-muted">+{log.words.length - shown.length} từ nữa</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        title="Xóa buổi luyện tập này"
        aria-label={`Xóa buổi luyện tập lúc ${formatTime(log.startedAt)}`}
        className={buttonClass('ghost-danger', 'icon', 'relative z-10')}
      >
        <Trash2 />
      </button>
      <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </li>
  );
}
