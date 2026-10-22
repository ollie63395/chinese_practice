import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { Assignment } from '../db/types';
import { type AssignmentProgress } from '../lib/assignments';
import { formatDay, formatDuration, parseIsoDate } from '../lib/time';
import { StatusPill } from './StatusPill';
import { MixedText } from './ui';

/** "3 từ · nói 2 phút · hạn ngày mai" */
export function assignmentSummary(assignment: Assignment): string {
  const parts = [`${assignment.wordCount} từ`, `nói ${formatDuration(assignment.timeLimitSec)}`];
  if (assignment.dueOn) parts.push(`hạn ${formatDay(parseIsoDate(assignment.dueOn)).toLowerCase()}`);
  return parts.join(' · ');
}

/** An assignment with one student's progress: for the student it leads to practising it, for a teacher to everyone's progress. */
export function AssignmentRow({ assignment, progress }: { assignment: Assignment; progress: AssignmentProgress }) {
  return (
    <li className="group relative flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs transition hover:border-accent/30">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/assignments/${assignment.id}`}
            className="font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            <MixedText>{assignment.title}</MixedText>
          </Link>
          <StatusPill progress={progress} />
        </div>
        <p className="mt-0.5 text-sm text-muted">{assignmentSummary(assignment)}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </li>
  );
}
