import { CalendarDays, Clock, Dices, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusPill } from '../../components/StatusPill';
import { buttonClass, MixedText, PageHeader, panelClass } from '../../components/ui';
import { useAccount } from '../../db/auth';
import { useAssignmentAttempts } from '../../db/hooks';
import type { Assignment } from '../../db/types';
import { studentProgress } from '../../lib/assignments';
import { cn } from '../../lib/cn';
import { formatDuration, formatDay, parseIsoDate } from '../../lib/time';

interface AssignmentIntroProps {
  assignment: Assignment;
  onDraw: () => void;
}

/** What the teacher asked for, and how far the student is with it, before drawing the words. */
export function AssignmentIntro({ assignment, onDraw }: AssignmentIntroProps) {
  const me = useAccount().id;
  const attempts = useAssignmentAttempts();
  const progress = attempts && studentProgress(assignment, attempts, me);

  return (
    <>
      <PageHeader
        back={{ to: '/assignments', label: 'Bài tập' }}
        zh="作业"
        title={assignment.title}
        description="Bài luyện nói giáo viên giao cho bạn. Hãy nói đủ thời gian để hoàn thành bài."
      />
      <div className="max-w-2xl space-y-4">
        <section className={cn(panelClass, 'space-y-4 rounded-2xl p-5')}>
          {progress && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <StatusPill progress={progress} />
              {progress.attempts > 0 && (
                <span>
                  Đã luyện {progress.attempts} lần · lâu nhất {formatDuration(progress.bestSpokenSec)}
                </span>
              )}
            </div>
          )}
          {assignment.instructions && (
            <p className="whitespace-pre-wrap">
              <MixedText>{assignment.instructions}</MixedText>
            </p>
          )}
          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact icon={<ListChecks />} label="Số từ">
              {assignment.wordCount} từ, bốc từ {assignment.words.length} từ
            </Fact>
            <Fact icon={<Clock />} label="Thời gian nói">
              {formatDuration(assignment.timeLimitSec)}
            </Fact>
            <Fact icon={<CalendarDays />} label="Hạn">
              {assignment.dueOn ? formatDay(parseIsoDate(assignment.dueOn)) : 'Không có hạn'}
            </Fact>
          </dl>
        </section>
        <button type="button" onClick={onDraw} className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
          <Dices /> Bốc {assignment.wordCount} từ
        </button>
      </div>
    </>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 text-faint [&_svg]:size-4">{icon}</span>
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-sm font-semibold">{children}</dd>
      </div>
    </div>
  );
}
