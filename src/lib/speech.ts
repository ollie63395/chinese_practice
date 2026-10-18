import { useSyncExternalStore } from 'react';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * How well a voice suits Mandarin: 0 for mainland Mandarin, 1 for other Mandarin (cmn, zh-TW),
 * null for anything else. Hong Kong, Macau and yue voices read Cantonese, so they're left out.
 */
function mandarinRank(voice: SpeechSynthesisVoice): number | null {
  const lang = voice.lang.replace(/_/g, '-').toLowerCase();
  const [language, ...rest] = lang.split('-');
  if (language !== 'zh' && language !== 'cmn') return null;
  if (rest.includes('hk') || rest.includes('mo') || /cantonese|粤|粵/i.test(voice.name)) return null;
  return ['zh-cn', 'zh-hans-cn', 'cmn-cn', 'cmn-hans-cn'].includes(lang) ? 0 : 1;
}

/** The best Mandarin voice in the list, if there is one. */
export function pickMandarinVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = Infinity;
  for (const voice of voices) {
    const rank = mandarinRank(voice);
    if (rank === null) continue;
    // Within a rank, prefer the higher-quality neural voices that some browsers offer.
    const score = rank * 2 + (/natural|neural|google|siri/i.test(voice.name) ? 0 : 1);
    if (score < bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

function mandarinVoice(): SpeechSynthesisVoice | undefined {
  return supported ? pickMandarinVoice(speechSynthesis.getVoices()) : undefined;
}

function subscribe(onChange: () => void) {
  if (!supported) return () => {};
  speechSynthesis.addEventListener('voiceschanged', onChange);
  return () => speechSynthesis.removeEventListener('voiceschanged', onChange);
}

/** Whether the browser has a Mandarin text-to-speech voice. Voices can load late, so this updates. */
export function useCanSpeakChinese(): boolean {
  return useSyncExternalStore(subscribe, () => mandarinVoice() !== undefined, () => false);
}

export function speakChinese(text: string): void {
  const voice = mandarinVoice();
  if (!voice) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}
