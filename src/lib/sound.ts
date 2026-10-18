let audio: AudioContext | undefined;

/**
 * Browsers only allow sound after a user gesture, so call this from a click
 * (e.g. "Start speaking") to be able to play the chime later.
 */
export function unlockAudio(): void {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // No Web Audio support; the chime is just skipped.
  }
}

/** A soft two-note bell. */
export function playChime(): void {
  const ctx = audio;
  if (!ctx) return;
  const start = ctx.currentTime;
  [880, 1318.5].forEach((frequency, i) => {
    const t = start + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  });
}
