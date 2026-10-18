import { ArrowLeft, Search, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghost-danger' | 'danger' | 'danger-solid' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

// text-card on the coloured fills reads as white in light mode and near-black in dark mode,
// where those colours are lighter.
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-sm shadow-accent/25 hover:bg-accent-hover active:translate-y-px',
  secondary: 'border border-line bg-card text-ink shadow-xs hover:bg-sunken active:translate-y-px',
  ghost: 'text-muted hover:bg-sunken hover:text-ink aria-[current=page]:bg-sunken aria-[current=page]:text-ink',
  'ghost-danger': 'text-muted hover:bg-danger-soft hover:text-danger',
  danger: 'border border-line bg-card text-danger hover:border-danger/40 hover:bg-danger-soft',
  'danger-solid': 'bg-danger text-card shadow-sm hover:opacity-90 active:translate-y-px',
  success: 'bg-good text-card shadow-sm hover:opacity-90 active:translate-y-px',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm [&_svg]:size-4',
  md: 'h-10 px-4 text-sm [&_svg]:size-4',
  lg: 'h-12 px-5 text-base [&_svg]:size-5',
  xl: 'h-14 px-6 text-base [&_svg]:size-5',
  icon: 'size-9 [&_svg]:size-[18px]',
};

/**
 * Classes for a button or a link styled as one. `extra` is for layout (margins, widths);
 * classes are joined, not merged, so don't use it to override colours, display or size.
 */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra?: string) {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-45',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    extra,
  );
}

// No width here: classes are joined, not merged, so a width added later wouldn't reliably win.
const fieldClass = cn(
  'rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink shadow-xs transition placeholder:text-faint',
  'focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none',
  'aria-invalid:border-danger aria-invalid:ring-danger/15',
);

export const inputClass = cn(fieldClass, 'w-full');

export const selectClass = cn(fieldClass, 'cursor-pointer pr-9');

export const panelClass = 'rounded-3xl border border-line bg-card shadow-xs';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, label, placeholder, autoFocus }: SearchInputProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={cn(inputClass, 'pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button
          type="button"
          aria-label="Xóa nội dung tìm kiếm"
          onClick={() => {
            onChange('');
            input.current?.focus();
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-faint transition hover:bg-sunken hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  badge?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, optional, badge, hint, error, children }: FieldProps) {
  const LabelTag = htmlFor ? 'label' : 'div';
  return (
    <div className="space-y-1.5">
      <LabelTag htmlFor={htmlFor} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-faint">không bắt buộc</span>}
        {badge}
      </LabelTag>
      {children}
      {error ? (
        <p id={htmlFor && `${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  /** A short caption in Chinese above the title. */
  zh?: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}

export function PageHeader({ title, zh, description, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-6 md:mb-8">
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {zh && (
            <p lang="zh-Hans" className="font-zh text-sm font-semibold text-accent-ink">
              {zh}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-prose text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-3 -ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-sm text-muted transition hover:text-ink"
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink [&_svg]:size-7">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mt-1.5 max-w-sm text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

/**
 * Text that may have Chinese among the Vietnamese (notes, meanings, tags, messages). Runs of
 * characters are marked lang="zh-Hans" so they get Chinese glyph shapes and screen-reader voices.
 */
export function MixedText({ children }: { children: string }) {
  const parts = children.split(/(\p{Script=Han}+)/u);
  if (parts.length === 1) return children;
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={i} lang="zh-Hans">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-ai-soft px-2.5 py-0.5 text-xs font-medium text-ai', className)}>
      <MixedText>{tag}</MixedText>
    </span>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-line bg-sunken p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
            value === option.value ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Shown while IndexedDB loads; it fades in late so quick loads don't flash. */
export function PageLoader() {
  return (
    <div className="grid animate-fade-in-late place-items-center py-24 text-sm text-faint" role="status">
      Đang tải…
    </div>
  );
}

/** The word in Chinese characters at a size that suits its length. */
export function hanziSizeClass(text: string, scale: 'card' | 'tile' = 'card') {
  const length = [...text].length;
  if (scale === 'tile') return length <= 4 ? 'text-2xl' : length <= 8 ? 'text-xl' : 'text-lg';
  if (length <= 3) return 'text-7xl md:text-8xl';
  if (length <= 6) return 'text-6xl md:text-7xl';
  if (length <= 10) return 'text-4xl md:text-5xl';
  return 'text-3xl md:text-4xl';
}
