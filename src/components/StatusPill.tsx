import { Check, CircleAlert, CircleDashed, Clock } from 'lucide-react';
import { statusLabel, type AssignmentProgress, type AssignmentStatus } from '../lib/assignments';
import { cn } from '../lib/cn';

const TONES: Record<AssignmentStatus, string> = {
  'not-started': 'bg-sunken text-muted',
  tried: 'bg-warn-soft text-warn',
  overdue: 'bg-danger-soft text-danger',
  done: 'bg-good-soft text-good',
};

const ICONS = { 'not-started': CircleDashed, tried: Clock, overdue: CircleAlert, done: Check };

/** How far a student is with an assignment. */
export function StatusPill({ progress, className }: { progress: AssignmentProgress; className?: string }) {
  const Icon = ICONS[progress.status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[progress.status],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {statusLabel(progress)}
    </span>
  );
}
