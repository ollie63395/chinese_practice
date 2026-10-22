import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { assignmentSummary, AssignmentRow } from '../components/AssignmentList';
import { buttonClass, EmptyState, MixedText, PageHeader, PageLoader } from '../components/ui';
import { useAccount } from '../db/auth';
import { useAssignmentAttempts, useAssignments } from '../db/hooks';
import type { Assignment, AssignmentAttempt } from '../db/types';
import { countStatuses, progressByStudent, sortForStudent, studentProgress } from '../lib/assignments';
import { useDocumentTitle } from '../lib/hooks';

/** A teacher's assignments with how far their students are, or a student's own assignments. */
export function AssignmentsPage() {
  useDocumentTitle('Bài tập');
  const { isTeacher } = useAccount();
  return isTeacher ? <TeacherAssignments /> : <StudentAssignments />;
}

function TeacherAssignments() {
  const assignments = useAssignments();
  const attempts = useAssignmentAttempts();
  const newButton = (
    <Link to="/assignments/new" className={buttonClass('primary')}>
      <Plus /> Giao bài mới
    </Link>
  );

  if (!assignments || !attempts) return <PageLoader />;

  return (
    <>
      <PageHeader
        zh="作业"
        title="Bài tập"
        description="Giao bài luyện nói cho học viên, rồi xem ai đã làm xong."
        actions={assignments.length > 0 && newButton}
      />
      {assignments.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="Chưa giao bài tập nào" action={newButton}>
          Chọn các từ trong kho của bạn, số từ mỗi lần bốc và thời gian nói, rồi giao cho học viên.
        </EmptyState>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {assignments.map((assignment) => (
            <TeacherAssignmentRow key={assignment.id} assignment={assignment} attempts={attempts} />
          ))}
        </ul>
      )}
    </>
  );
}

function TeacherAssignmentRow({ assignment, attempts }: { assignment: Assignment; attempts: AssignmentAttempt[] }) {
  const counts = countStatuses(progressByStudent(assignment, attempts).values());
  const total = assignment.studentIds.length;
  return (
    <li className="group relative flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs transition hover:border-accent/30">
      <div className="min-w-0 flex-1">
        <Link
          to={`/assignments/${assignment.id}`}
          className="font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
        >
          <MixedText>{assignment.title}</MixedText>
        </Link>
        <p className="py-0.5 text-sm text-muted">{assignmentSummary(assignment)}</p>
        <div className="mt-2 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Đã hoàn thành"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={counts.done}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
          >
            <div className="h-full rounded-full bg-good" style={{ width: `${total ? (counts.done / total) * 100 : 0}%` }} />
          </div>
          <p className="shrink-0 text-sm text-muted tabular-nums">
            {counts.done}/{total} đã hoàn thành
            {counts.overdue > 0 && <span className="text-danger"> · {counts.overdue} quá hạn</span>}
          </p>
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </li>
  );
}

function StudentAssignments() {
  const me = useAccount().id;
  const assignments = useAssignments();
  const attempts = useAssignmentAttempts();

  if (!assignments || !attempts) return <PageLoader />;

  const items = sortForStudent(
    assignments.map((assignment) => ({ assignment, progress: studentProgress(assignment, attempts, me) })),
  );
  const toDo = items.filter((i) => i.progress.status !== 'done');
  const done = items.filter((i) => i.progress.status === 'done');

  return (
    <>
      <PageHeader zh="作业" title="Bài tập" description="Bài luyện nói giáo viên giao cho bạn. Nói đủ thời gian là hoàn thành bài." />
      {items.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="Chưa có bài tập nào">
          Khi giáo viên giao bài luyện nói cho bạn, bài sẽ hiện ở đây.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {toDo.length > 0 && (
            <section aria-label="Cần làm">
              <h2 className="mb-2 text-sm font-semibold text-muted">Cần làm ({toDo.length})</h2>
              <ul className="grid gap-2 md:grid-cols-2">
                {toDo.map((item) => (
                  <AssignmentRow key={item.assignment.id} {...item} />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section aria-label="Đã hoàn thành">
              <h2 className="mb-2 text-sm font-semibold text-muted">Đã hoàn thành ({done.length})</h2>
              <ul className="grid gap-2 md:grid-cols-2">
                {done.map((item) => (
                  <AssignmentRow key={item.assignment.id} {...item} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
