import { Dices, Mic, Plus } from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Link } from 'react-router';
import { DurationInput, MIN_SPEECH_SECONDS, NumberStepper } from '../../components/NumberInputs';
import { TagPicker } from '../../components/TagPicker';
import { buttonClass, EmptyState, PageHeader, panelClass, Segmented } from '../../components/ui';
import { cn } from '../../lib/cn';
import type { TagCount } from '../../lib/tags';
import type { SpeakingSettings } from './SpeakingPage';

interface SetupStepProps {
  wordCount: number;
  tagCounts: TagCount[];
  settings: SpeakingSettings;
  onSettingsChange: Dispatch<SetStateAction<SpeakingSettings>>;
  source: SpeakingSettings['source'];
  selectedTags: string[];
  poolSize: number;
  onDraw: () => void;
}

export function SetupStep({ wordCount, tagCounts, settings, onSettingsChange, source, selectedTags, poolSize, onDraw }: SetupStepProps) {
  const header = (
    <PageHeader
      zh="口语练习"
      title="Luyện nói"
      description="Nhận vài từ ngẫu nhiên trong kho của bạn, chuẩn bị một bài nói ngắn hoặc một câu chuyện có dùng các từ đó, rồi nói trong thời gian giới hạn."
    />
  );

  if (wordCount === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Mic />}
          title="Hãy thêm vài từ trước đã"
          action={
            <Link to="/words/new" className={buttonClass('primary')}>
              <Plus /> Thêm từ
            </Link>
          }
        >
          Luyện nói sẽ bốc ngẫu nhiên các từ trong kho từ vựng của bạn.
        </EmptyState>
      </>
    );
  }

  const max = Math.max(1, poolSize);
  const count = Math.min(settings.count, max);
  const canDraw = poolSize > 0 && settings.timeLimitSec >= MIN_SPEECH_SECONDS;

  return (
    <>
      {header}
      <div className="max-w-2xl space-y-4">
        <SetupRow
          step={1}
          title="Bao nhiêu từ?"
          htmlFor="word-count"
          description={`Bốc ngẫu nhiên trong số ${poolSize} từ.`}
        >
          <NumberStepper
            id="word-count"
            label="số từ"
            value={count}
            min={1}
            max={max}
            onChange={(n) => onSettingsChange((s) => ({ ...s, count: n }))}
          />
        </SetupRow>

        <SetupRow
          step={2}
          title="Thời gian nói"
          description="Thời gian chuẩn bị không bị tính. Đồng hồ chỉ chạy khi bạn bắt đầu nói."
        >
          <DurationInput
            idPrefix="time-limit"
            seconds={settings.timeLimitSec}
            onChange={(timeLimitSec) => onSettingsChange((s) => ({ ...s, timeLimitSec }))}
          />
        </SetupRow>

        {tagCounts.length > 0 && (
          <SetupRow step={3} title="Bốc từ trong">
            <Segmented
              label="Bốc từ trong"
              value={source}
              onChange={(value) => onSettingsChange((s) => ({ ...s, source: value }))}
              options={[
                { value: 'all', label: 'Tất cả các từ' },
                { value: 'tags', label: 'Một số nhãn' },
              ]}
            />
            {source === 'tags' && (
              <div className="mt-3 space-y-2">
                <TagPicker
                  tags={tagCounts}
                  selected={selectedTags}
                  onChange={(tags) => onSettingsChange((s) => ({ ...s, tags }))}
                />
                {selectedTags.length === 0 && <p className="text-sm text-muted">Hãy chọn ít nhất một nhãn.</p>}
              </div>
            )}
          </SetupRow>
        )}

        <button type="button" onClick={onDraw} disabled={!canDraw} className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
          <Dices /> Bốc {count} từ
        </button>
      </div>
    </>
  );
}

interface SetupRowProps {
  step: number;
  title: string;
  htmlFor?: string;
  description?: string;
  children: ReactNode;
}

/** A numbered step of a settings form. */
export function SetupRow({ step, title, htmlFor, description, children }: SetupRowProps) {
  return (
    <section className={cn(panelClass, 'flex gap-4 rounded-2xl p-5')}>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-paper">
        {step}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          {htmlFor ? (
            <label htmlFor={htmlFor} className="font-semibold">
              {title}
            </label>
          ) : (
            <h2 className="font-semibold">{title}</h2>
          )}
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
