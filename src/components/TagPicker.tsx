import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import type { TagCount } from '../lib/tags';
import { MixedText } from './ui';

interface TagPickerProps {
  tags: TagCount[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Toggle chips for choosing several tags, each showing how many words it has. */
export function TagPicker({ tags, selected, onChange }: TagPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const on = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((t) => t !== tag) : [...selected, tag])}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
              on
                ? 'border-ai bg-ai text-card'
                : 'border-line bg-card text-ink hover:border-ai/50 hover:text-ai',
            )}
          >
            {on && <Check className="size-3.5" />}
            <MixedText>{tag}</MixedText>
            <span className={cn('text-xs tabular-nums', on ? 'opacity-80' : 'text-faint')}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
