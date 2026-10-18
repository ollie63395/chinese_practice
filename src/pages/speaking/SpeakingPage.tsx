import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router';
import { useConfirm, useToast } from '../../components/feedback';
import { MAX_SPEECH_SECONDS, MIN_SPEECH_SECONDS } from '../../components/NumberInputs';
import { PageLoader } from '../../components/ui';
import { useTagCounts, useWords } from '../../db/hooks';
import { addPractice } from '../../db/practices';
import type { PracticeLog, Word } from '../../db/types';
import { useBeforeUnload, useDocumentTitle } from '../../lib/hooks';
import { isRecord, stringArray, useRememberedState } from '../../lib/prefs';
import { sample } from '../../lib/random';
import { unlockAudio } from '../../lib/sound';
import { wordsWithAnyTag } from '../../lib/tags';
import { DoneStep } from './DoneStep';
import { PrepareStep } from './PrepareStep';
import { SetupStep } from './SetupStep';
import { SpeakStep, type SpeechResult } from './SpeakStep';

type Phase = 'setup' | 'prepare' | 'speaking' | 'done';

export interface SpeakingSettings {
  count: number;
  timeLimitSec: number;
  source: 'all' | 'tags';
  tags: string[];
}

function sanitizeSettings(stored: unknown): SpeakingSettings {
  const s = isRecord(stored) ? stored : {};
  const { count, timeLimitSec } = s;
  return {
    count: typeof count === 'number' && Number.isInteger(count) && count >= 1 ? count : 5,
    timeLimitSec:
      typeof timeLimitSec === 'number' && timeLimitSec >= MIN_SPEECH_SECONDS && timeLimitSec <= MAX_SPEECH_SECONDS
        ? Math.round(timeLimitSec)
        : 120,
    source: s.source === 'tags' ? 'tags' : 'all',
    tags: stringArray(s.tags),
  };
}

/** Navigation state for practising a past session's words again (see the history page). */
export interface ReplayState {
  wordIds: string[];
  timeLimitSec: number;
  notes: string;
}

export function SpeakingPage() {
  useDocumentTitle('Luyện nói');
  const words = useWords();
  const tagCounts = useTagCounts(words);
  const [settings, setSettings] = useRememberedState('speaking', sanitizeSettings);
  const [phase, setPhase] = useState<Phase>('setup');
  const [chosen, setChosen] = useState<Word[]>([]);
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [log, setLog] = useState<PracticeLog | null>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();

  // Remembered tags may no longer exist.
  const selectedTags = useMemo(
    () => settings.tags.filter((tag) => tagCounts.some((t) => t.tag === tag)),
    [settings.tags, tagCounts],
  );
  const source = settings.source === 'tags' && tagCounts.length > 0 ? 'tags' : 'all';
  const pool = useMemo(
    () => (!words ? [] : source === 'tags' ? wordsWithAnyTag(words, selectedTags) : words),
    [words, source, selectedTags],
  );

  // Arriving from "Practise these words again" in history: go straight to preparing.
  const replay = location.state as Partial<ReplayState> | null;
  useEffect(() => {
    if (!replay?.wordIds || !words) return;
    const byId = new Map(words.map((w) => [w.id, w]));
    const picked = replay.wordIds.flatMap((id) => byId.get(id) ?? []);
    const { timeLimitSec, notes: replayNotes } = replay;
    if (picked.length > 0) {
      setChosen(picked);
      setNotes(typeof replayNotes === 'string' ? replayNotes : '');
      if (typeof timeLimitSec === 'number' && timeLimitSec >= MIN_SPEECH_SECONDS) {
        setSettings((s) => ({ ...s, timeLimitSec }));
      }
      setPhase('prepare');
    }
    // Clear the state so a reload doesn't start over.
    void navigate('.', { replace: true, state: null });
  }, [replay, words, navigate, setSettings]);

  // Leaving mid-practice loses it, so check first.
  const inProgress = phase === 'prepare' || phase === 'speaking';
  useBeforeUnload(inProgress);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => inProgress && currentLocation.pathname !== nextLocation.pathname,
  );
  const onBlocked = useEffectEvent(async () => {
    if (blocker.state !== 'blocked') return;
    const leave = await confirm({
      title: phase === 'speaking' ? 'Dừng buổi luyện này?' : 'Rời khỏi buổi luyện này?',
      message:
        phase === 'speaking'
          ? 'Đồng hồ sẽ dừng và buổi này sẽ không được lưu vào lịch sử.'
          : 'Các từ và ghi chú của buổi luyện này sẽ bị mất.',
      confirmLabel: 'Rời đi',
      cancelLabel: 'Ở lại',
      danger: true,
    });
    if (leave) blocker.proceed();
    else blocker.reset();
  });
  useEffect(() => {
    if (blocker.state === 'blocked') void onBlocked();
  }, [blocker.state]);

  const drawWords = (count: number) => sample(pool, Math.min(count, pool.length));

  const draw = () => {
    setChosen(drawWords(settings.count));
    setNotes('');
    setPhase('prepare');
  };

  const backToSetup = async () => {
    if (notes.trim()) {
      const ok = await confirm({
        title: 'Bỏ các từ và ghi chú này?',
        message: 'Bạn có thể bốc từ mới ở trang cài đặt.',
        confirmLabel: 'Bỏ đi',
        danger: true,
      });
      if (!ok) return;
    }
    setPhase('setup');
  };

  const startSpeaking = () => {
    unlockAudio(); // Must happen in the click for the end chime to be allowed to play.
    setStartedAt(Date.now());
    setPhase('speaking');
  };

  const finish = async (result: SpeechResult) => {
    const entry: Omit<PracticeLog, 'id'> = {
      startedAt,
      endedAt: Date.now(),
      timeLimitSec: settings.timeLimitSec,
      spokenSec: result.spokenSec,
      endedEarly: result.endedEarly,
      notes: notes.trim(),
      words: chosen.map((w) => ({
        id: w.id,
        word: w.word,
        reading: w.reading,
        meaning: w.meaning,
        used: result.usedIds.includes(w.id),
      })),
    };
    let saved: PracticeLog;
    try {
      saved = await addPractice(entry);
    } catch {
      saved = { ...entry, id: '' };
      toast('Không lưu được buổi luyện này vào lịch sử.');
    }
    setLog(saved);
    setPhase('done');
  };

  if (!words) return <PageLoader />;

  switch (phase) {
    case 'setup':
      return (
        <SetupStep
          wordCount={words.length}
          tagCounts={tagCounts}
          settings={settings}
          onSettingsChange={setSettings}
          source={source}
          selectedTags={selectedTags}
          poolSize={pool.length}
          onDraw={draw}
        />
      );
    case 'prepare':
      return (
        <PrepareStep
          chosen={chosen}
          onChosenChange={setChosen}
          pool={pool}
          allWords={words}
          notes={notes}
          onNotesChange={setNotes}
          timeLimitSec={settings.timeLimitSec}
          onTimeLimitChange={(timeLimitSec) => setSettings((s) => ({ ...s, timeLimitSec }))}
          onRedraw={() => setChosen(drawWords(chosen.length || settings.count))}
          onBack={() => void backToSetup()}
          onStart={startSpeaking}
        />
      );
    case 'speaking':
      return <SpeakStep words={chosen} notes={notes} timeLimitSec={settings.timeLimitSec} onFinish={(r) => void finish(r)} />;
    case 'done':
      return (
        <DoneStep
          log={log}
          onDrawAgain={draw}
          // Notes are kept: retrying the same words usually means retrying the same plan.
          onSameWords={() => setPhase('prepare')}
          onChangeSettings={() => setPhase('setup')}
        />
      );
  }
}
