import { Check, Dices, PartyPopper, Repeat, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { PracticeWordList } from '../../components/PracticeWordList';
import { buttonClass, MixedText, PageLoader, panelClass } from '../../components/ui';
import type { PracticeLog } from '../../db/types';
import { cn } from '../../lib/cn';
import { formatDuration } from '../../lib/time';

interface DoneStepProps {
  log: PracticeLog | null;
  onDrawAgain: () => void;
  onSameWords: () => void;
  onChangeSettings: () => void;
}

export function DoneStep({ log, onDrawAgain, onSameWords, onChangeSettings }: DoneStepProps) {
  if (!log) return <PageLoader />;
  const usedCount = log.words.filter((w) => w.used).length;

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <div className="text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-good-soft text-good">
          <PartyPopper className="size-8" />
        </div>
        <p lang="zh-Hans" className="font-zh text-sm font-semibold text-accent-ink">
          {log.endedEarly ? '辛苦了！' : '时间到！'}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{log.endedEarly ? 'Làm tốt lắm!' : 'Hết giờ!'}</h1>
        <p className="mt-2 text-muted">
          Bạn đã nói <strong className="text-ink">{formatDuration(log.spokenSec)}</strong>
          {log.endedEarly && <> trong tổng số {formatDuration(log.timeLimitSec)}</>}
          {usedCount > 0 && (
            <>
              {' '}
              và dùng <strong className="text-ink">{usedCount}</strong> trên {log.words.length} từ
            </>
          )}
          .
        </p>
        {log.id && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-good">
            <Check className="size-4" /> Đã lưu vào lịch sử
          </p>
        )}
      </div>

      <div className="mt-8">
        <PracticeWordList words={log.words} showUsed={usedCount > 0} />
      </div>

      {log.notes && (
        <section className={cn(panelClass, 'mt-4 rounded-2xl p-4')}>
          <h2 className="text-sm font-semibold">Ghi chú của bạn</h2>
          <p className="mt-1 whitespace-pre-wrap text-muted">
            <MixedText>{log.notes}</MixedText>
          </p>
        </section>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onDrawAgain} className={buttonClass('primary', 'lg')}>
          <Dices /> Bốc từ mới
        </button>
        <button type="button" onClick={onSameWords} className={buttonClass('secondary', 'lg')}>
          <Repeat /> Dùng lại các từ này
        </button>
        <button type="button" onClick={onChangeSettings} className={buttonClass('ghost', 'lg')}>
          <SlidersHorizontal /> Đổi cài đặt
        </button>
      </div>
      {log.id && (
        <p className="mt-4 text-center text-sm">
          <Link to={`/history/${log.id}`} className="text-accent-ink hover:underline">
            Xem buổi này trong lịch sử
          </Link>
        </p>
      )}
    </div>
  );
}
