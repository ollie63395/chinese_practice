import { ChevronRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { PracticeLog } from '../db/types';
import { formatClock, formatDay, formatTime, startOfDay } from '../lib/time';
import { buttonClass } from './ui';

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

interface PracticeHistoryProps {
  practices: PracticeLog[];
  /** Where a session's details are. */
  linkTo: (log: PracticeLog) => string;
  /** Left out where sessions can only be looked at (a teacher viewing a student). */
  onDelete?: (log: PracticeLog) => void;
}

/** Practice sessions, newest first, grouped by day. */
export function PracticeHistory({ practices, linkTo, onDelete }: PracticeHistoryProps) {
  return (
    <div className="space-y-8">
      {groupByDay(practices).map((group) => (
        <section key={group.day} aria-label={formatDay(group.day)}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{formatDay(group.day)}</h2>
          <ul className="space-y-2">
            {group.logs.map((log) => (
              <HistoryRow key={log.id} log={log} to={linkTo(log)} onDelete={onDelete && (() => onDelete(log))} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function HistoryRow({ log, to, onDelete }: { log: PracticeLog; to: string; onDelete?: () => void }) {
  const shown = log.words.slice(0, 6);
  const usedCount = log.words.filter((w) => w.used).length;
  return (
    <li className="group relative flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs transition hover:border-accent/30">
      <div className="min-w-0 flex-1">
        <Link
          to={to}
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
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Xóa buổi luyện tập này"
          aria-label={`Xóa buổi luyện tập lúc ${formatTime(log.startedAt)}`}
          className={buttonClass('ghost-danger', 'icon', 'relative z-10')}
        >
          <Trash2 />
        </button>
      )}
      <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </li>
  );
}
