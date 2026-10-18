import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { convertWhileTyping, finalizeReading } from '../lib/pinyin';

type PinyinInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'ref'> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * A text field that turns tone numbers into tone marks as you type (ni3 → nǐ, lv4 → lǜ).
 * A web page can't switch the device keyboard, so this works with any keyboard;
 * text from an IME is only converted once its composition ends.
 */
export function PinyinInput({ value, onValueChange, onBlur, onCompositionEnd, ...props }: PinyinInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // Converting shortens the text ("ni3" → "nǐ"), so put the caret back where it belongs.
  useLayoutEffect(() => {
    const input = ref.current;
    if (pendingCaret.current !== null && input && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  const convert = (input: HTMLInputElement) => {
    const result = convertWhileTyping(input.value, input.selectionStart ?? input.value.length);
    if (result.value !== input.value) pendingCaret.current = result.caret;
    onValueChange(result.value);
  };

  return (
    <input
      {...props}
      ref={ref}
      lang="zh-Latn-pinyin"
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={(event) => {
        // Don't touch an IME's text mid-composition; it's converted once composition ends.
        if ((event.nativeEvent as InputEvent).isComposing) onValueChange(event.target.value);
        else convert(event.target);
      }}
      onCompositionEnd={(event) => {
        convert(event.currentTarget);
        onCompositionEnd?.(event);
      }}
      onBlur={(event) => {
        const settled = finalizeReading(event.target.value);
        if (settled !== event.target.value) onValueChange(settled);
        onBlur?.(event);
      }}
    />
  );
}
