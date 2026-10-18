import { X } from 'lucide-react';
import { useState } from 'react';
import { addTag, splitTags } from '../lib/tags';
import { MixedText } from './ui';

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used on other words, offered as one-tap choices. */
  suggestions: string[];
}

export function TagInput({ id, value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    onChange(addTag(value, raw, suggestions));
    setDraft('');
  };

  const query = draft.trim().toLowerCase();
  const available = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()) && s.toLowerCase().includes(query),
  );

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-card px-2 py-1.5 shadow-xs transition focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-ai-soft py-0.5 pr-1 pl-2.5 text-sm font-medium text-ai"
          >
            <MixedText>{tag}</MixedText>
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Xóa nhãn ${tag}`}
              className="grid size-5 cursor-pointer place-items-center rounded-full transition hover:bg-ai/15"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(event) => {
            const parts = splitTags(event.target.value);
            if (parts.length === 1) {
              setDraft(event.target.value);
              return;
            }
            // A comma was typed or pasted: everything before the last comma becomes tags.
            let next = value;
            for (const part of parts.slice(0, -1)) next = addTag(next, part, suggestions);
            onChange(next);
            setDraft(parts[parts.length - 1]);
          }}
          onKeyDown={(event) => {
            // Enter while an IME is composing confirms the text it's building (e.g. a character); leave it alone.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter' && draft.trim()) {
              event.preventDefault();
              commit(draft);
            } else if (event.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          placeholder={value.length ? 'Thêm nhãn khác…' : 'VD: động từ, đồ ăn, HSK 1'}
          enterKeyHint="done"
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-ink placeholder:text-faint focus:outline-none"
        />
      </div>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Nhãn của bạn:</span>
          {available.slice(0, 16).map((tag) => (
            <button
              key={tag}
              type="button"
              // Keep focus in the text box, so a half-typed tag isn't committed on blur first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(tag)}
              className="cursor-pointer rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted transition hover:border-ai/50 hover:text-ai"
            >
              + <MixedText>{tag}</MixedText>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
