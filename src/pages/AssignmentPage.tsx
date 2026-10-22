import { ChevronRight, Pencil, SearchX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { assignmentSummary } from '../components/AssignmentList';
import { useConfirm, useToast } from '../components/feedback';
import { StatusPill } from '../components/StatusPill';
import { buttonClass, EmptyState, MixedText, PageHeader, PageLoader, panelClass } from '../components/ui';
import { deleteAssignment } from '../db/assignments';
import { useAccount } from '../db/auth';
import { useAccountSummaries, useAssignmentAttempts, useAssignments } from '../db/hooks';
import type { Assignment } from '../db/types';
import { countStatuses, progressByStudent, STATUS_LABELS, type AssignmentProgress, type AssignmentStatus } from '../lib/assignments';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { formatClock, formatDay, formatTime } from '../lib/time';
import { SpeakingPage } from './speaking/SpeakingPage';
import { Avatar } from './StudentsPage';

/** For a teacher, how each student is doing with an assignment; for a student, practising it. */
export function AssignmentPage() {
  const { isTeacher } = useAccount();
  const { id = '' } = useParams();
  return isTeacher ? <AssignmentProgressView key={id} id={id} /> : <StudentAssignment key={id} id={id} />;
}

function NotFound() {
  return (
    <EmptyState
      icon={<SearchX />}
      title="Không tìm thấy bài tập này"
      action={
        <Link to="/assignments" className={buttonClass('secondary')}>
          Quay lại danh sách bài tập
        </Link>
      }
    >
      Có thể bài tập đã bị xóa.
    </EmptyState>
  );
}

function StudentAssignment({ id }: { id: string }) {
  const assignments = useAssignments();
  const found = assignments?.find((a) => a.id === id);
  // Kept if it disappears mid-practice (the teacher deleted it), so the practice isn't lost;
  // saving then falls back to plain history.
  const [kept, setKept] = useState(found);
  if (found && found !== kept) setKept(found);
  const assignment = found ?? kept;

  if (assignment) return <SpeakingPage assignment={assignment} />;
  return assignments ? <NotFound /> : <PageLoader />;
}

const STATUS_ORDER: AssignmentStatus[] = ['done', 'tried', 'overdue', 'not-started'];

const FILTER_TONES: Record<AssignmentStatus, string> = {
  done: 'aria-pressed:border-good aria-pressed:bg-good-soft',
  tried: 'aria-pressed:border-warn aria-pressed:bg-warn-soft',
  overdue: 'aria-pressed:border-danger aria-pressed:bg-danger-soft',
  'not-started': 'aria-pressed:border-ink/40 aria-pressed:bg-sunken',
};

function AssignmentProgressView({ id }: { id: string }) {
  const me = useAccount().id;
  const assignments = useAssignments();
  const attempts = useAssignmentAttempts();
  const accounts = useAccountSummaries();
  const assignment = assignments?.find((a) => a.id === id);
  useDocumentTitle(assignment?.title ?? 'Bài tập');
  const [filter, setFilter] = useState<AssignmentStatus | null>(null);

  if (!assignments || !attempts || !accounts) return <PageLoader />;
  if (!assignment) return <NotFound />;

  const names = new Map(accounts.map((a) => [a.id, a.displayName]));
  const progress = progressByStudent(assignment, attempts);
  const counts = countStatuses(progress.values());
  const rows = [...progress]
    .map(([studentId, p]) => ({ studentId, name: names.get(studentId) ?? 'Tài khoản đã xóa', progress: p }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const shown = filter ? rows.filter((r) => r.progress.status === filter) : rows;
  const mine = assignment.teacherId === me;
  // Only assignments with a due day can be overdue.
  const statuses = STATUS_ORDER.filter((s) => s !== 'overdue' || assignment.dueOn);

  return (
    <>
      <PageHeader
        back={{ to: '/assignments', label: 'Bài tập' }}
        zh="作业"
        title={<MixedText>{assignment.title}</MixedText>}
        description={
          <>
            {assignmentSummary(assignment)} · bốc từ {assignment.words.length} từ
            {!mine && ` · giao bởi ${names.get(assignment.teacherId) ?? 'giáo viên khác'}`}
          </>
        }
        actions={mine && <AssignmentActions assignment={assignment} />}
      />

      {assignment.instructions && (
        <section className={cn(panelClass, 'mb-6 rounded-2xl p-5')}>
          <h2 className="text-sm font-semibold">Đề bài</h2>
          <p className="mt-1 whitespace-pre-wrap text-muted">
            <MixedText>{assignment.instructions}</MixedText>
          </p>
        </section>
      )}

      <details className={cn(panelClass, 'mb-6 rounded-2xl px-5 py-3')}>
        <summary className="cursor-pointer py-1 text-sm font-semibold">Kho từ ({assignment.words.length})</summary>
        <ul className="mt-2 flex flex-wrap gap-1.5 pb-2">
          {assignment.words.map((word) => (
            <li key={word.id} className="rounded-lg bg-sunken px-2 py-0.5" title={`${word.reading} · ${word.meaning}`}>
              <span lang="zh-Hans" className="font-zh text-base font-semibold">
                {word.word}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div role="group" aria-label="Lọc theo trạng thái" className={cn('mb-5 grid grid-cols-2 gap-2', statuses.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filter === status}
            onClick={() => setFilter((f) => (f === status ? null : status))}
            className={cn(
              'cursor-pointer rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-xs transition hover:border-ink/25',
              FILTER_TONES[status],
            )}
          >
            <span className="block text-xl font-bold tabular-nums">{counts[status]}</span>
            <span className="text-sm text-muted">{STATUS_LABELS[status]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-6 py-12 text-center text-muted">
          {rows.length === 0 ? 'Bài này chưa giao cho học viên nào.' : 'Không có học viên nào ở trạng thái này.'}
        </p>
      ) : (
        <ul aria-label="Học viên" className="grid gap-2 md:grid-cols-2">
          {shown.map((row) => (
            <StudentRow key={row.studentId} {...row} timeLimitSec={assignment.timeLimitSec} />
          ))}
        </ul>
      )}
    </>
  );
}

interface StudentRowProps {
  studentId: string;
  name: string;
  progress: AssignmentProgress;
  timeLimitSec: number;
}

function StudentRow({ studentId, name, progress, timeLimitSec }: StudentRowProps) {
  const last = progress.lastAttempt;
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link to={`/students/${studentId}`} className="font-semibold hover:underline">
            {name}
          </Link>
          <StatusPill progress={progress} />
        </div>
        <p className="py-0.5 text-sm text-muted">
          {progress.completedAt !== null
            ? `Xong ${formatDay(progress.completedAt).toLowerCase()} lúc ${formatTime(progress.completedAt)}`
            : progress.attempts > 0
              ? `Lâu nhất ${formatClock(progress.bestSpokenSec)} / ${formatClock(timeLimitSec)}`
              : 'Chưa có buổi luyện nào'}
          {progress.attempts > 0 && ` · ${progress.attempts} lần`}
        </p>
        {last && (
          <Link
            to={`/students/${studentId}/history/${last.id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:underline"
          >
            Xem buổi gần nhất <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </li>
  );
}

function AssignmentActions({ assignment }: { assignment: Assignment }) {
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  const remove = async () => {
    const ok = await confirm({
      title: 'Xóa bài tập này?',
      message: 'Học viên sẽ không thấy bài này nữa. Các buổi luyện họ đã làm vẫn còn trong lịch sử của họ.',
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAssignment(assignment.id);
    } catch (err) {
      toast(err instanceof Error ? `Không xóa được: ${err.message}` : 'Không xóa được bài tập.');
      return;
    }
    toast('Đã xóa bài tập');
    void navigate('/assignments', { replace: true });
  };

  return (
    <>
      <Link to={`/assignments/${assignment.id}/edit`} className={buttonClass('secondary')}>
        <Pencil /> Sửa
      </Link>
      <button type="button" onClick={() => void remove()} className={buttonClass('danger')}>
        <Trash2 /> Xóa
      </button>
    </>
  );
}
