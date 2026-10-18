import { Minus, Plus } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { formatDuration } from '../lib/time';

type NumberFieldProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'min' | 'max'> & {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
};

/**
 * A whole-number input that lets you clear it and type freely; only in-range
 * values are reported, and it shows the last valid value again on blur.
 */
export function NumberField({ value, min, max, onValueChange, onBlur, className, ...props }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...props}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(event) => {
        setDraft(event.target.value);
        const n = Number(event.target.value);
        if (event.target.value !== '' && Number.isInteger(n) && n >= min && n <= max) onValueChange(n);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
      className={cn('text-center tabular-nums focus:outline-none', className)}
    />
  );
}

interface StepperProps {
  /** Give an id when a visible <label> names the field. */
  id?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** What's being counted, e.g. "số từ", for the −/+ button labels. */
  label: string;
}

export function NumberStepper({ id, value, min, max, onChange, label }: StepperProps) {
  const stepButton = 'grid size-10 cursor-pointer place-items-center text-muted transition hover:text-ink disabled:pointer-events-none disabled:opacity-35';
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-card shadow-xs focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15">
      <button type="button" aria-label={`Giảm ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={stepButton}>
        <Minus className="size-4" />
      </button>
      <NumberField
        id={id}
        aria-label={id ? undefined : label}
        value={value}
        min={min}
        max={max}
        onValueChange={onChange}
        className="h-10 w-14 bg-transparent text-lg font-semibold"
      />
      <button type="button" aria-label={`Tăng ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={stepButton}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

const DURATION_PRESETS = [30, 60, 120, 180, 300];
export const MIN_SPEECH_SECONDS = 10;
export const MAX_SPEECH_SECONDS = 60 * 60 + 59;

interface DurationInputProps {
  idPrefix: string;
  seconds: number;
  onChange: (seconds: number) => void;
}

/** Minutes and seconds fields plus one-tap presets. */
export function DurationInput({ idPrefix, seconds, onChange }: DurationInputProps) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const box = 'inline-flex items-center gap-1.5 rounded-xl border border-line bg-card pr-3 shadow-xs focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className={box}>
          <NumberField id={`${idPrefix}-min`} value={minutes} min={0} max={Math.floor(MAX_SPEECH_SECONDS / 60)} onValueChange={(m) => onChange(m * 60 + rest)} className="h-10 w-14 bg-transparent text-lg font-semibold" />
          <span className="text-sm text-muted">phút</span>
        </label>
        <label className={box}>
          <NumberField id={`${idPrefix}-sec`} value={rest} min={0} max={59} onValueChange={(s) => onChange(minutes * 60 + s)} className="h-10 w-14 bg-transparent text-lg font-semibold" />
          <span className="text-sm text-muted">giây</span>
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={seconds === preset}
            onClick={() => onChange(preset)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-sm transition',
              seconds === preset ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-muted hover:text-ink',
            )}
          >
            {formatDuration(preset)}
          </button>
        ))}
      </div>
      {seconds < MIN_SPEECH_SECONDS && (
        <p className="text-sm text-danger" role="alert">
          Hãy đặt ít nhất {MIN_SPEECH_SECONDS} giây.
        </p>
      )}
    </div>
  );
}
