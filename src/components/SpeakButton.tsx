import { Volume2 } from 'lucide-react';
import { speakChinese, useCanSpeakChinese } from '../lib/speech';
import { buttonClass } from './ui';

interface SpeakButtonProps {
  /** Pass the Chinese characters, not the pinyin: text-to-speech reads characters well and pinyin badly. */
  text: string;
  showLabel?: boolean;
  className?: string;
}

/** Reads the text aloud with a Mandarin voice. Hidden when the browser has none. */
export function SpeakButton({ text, showLabel, className }: SpeakButtonProps) {
  const available = useCanSpeakChinese();
  if (!available || !text) return null;
  return (
    <button
      type="button"
      title="Nghe"
      aria-label={`Nghe ${text}`}
      onClick={(event) => {
        event.stopPropagation();
        speakChinese(text);
      }}
      className={buttonClass('ghost', showLabel ? 'sm' : 'icon', className)}
    >
      <Volume2 />
      {showLabel && 'Nghe'}
    </button>
  );
}
