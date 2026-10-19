import { Mic, SearchX, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { PracticeWordList } from '../components/PracticeWordList';
import { buttonClass, EmptyState, MixedText, PageHeader, PageLoader, panelClass } from '../components/ui';
import { useAccount } from '../db/auth';
import { usePractice, useProfile, useWords } from '../db/hooks';
import { deletePractice } from '../db/practices';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { formatClock, formatDay, formatTime } from '../lib/time';
import type { ReplayState } from './speaking/SpeakingPage';

/** One practice session: the signed-in account's own, or (for a teacher) a student's, read-only. */
export function HistoryDetailPage() {
  useDocumentTitle('Buổi luyện tập');
  const { id = '', studentId } = useParams();
  const me = useAccount().id;
  const owner = studentId ?? me;
  const readOnly = owner !== me;
  const backTo = readOnly ? `/students/${owner}?tab=history` : '/history';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const log = usePractice(owner, id);
  // The words as they are now, for their pictures and for practising them again.
  const words = useWords(owner);
  const ownerProfile = useProfile(owner);

  if (log === undefined) return <PageLoader />;
  if (log === null) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Không tìm thấy buổi luyện tập"
        action={
          <Link to={backTo} className={buttonClass('secondary')}>
            Quay lại lịch sử
          </Link>
        }
      >
        Có thể buổi này đã bị xóa.
      </EmptyState>
    );
  }

  const practisedIds = new Set(log.words.map((w) => w.id));
  const stillThere = (words ?? []).filter((w) => practisedIds.has(w.id));
  const imagePaths = new Map(stillThere.flatMap((w) => (w.imagePath ? [[w.id, w.imagePath] as const] : [])));
  const usedCount = log.words.filter((w) => w.used).length;

  const practiceAgain = () => {
    if (stillThere.length === 0) {
      toast('Không còn từ nào trong số này ở kho từ vựng.');
      return;
    }
    const missing = log.words.length - stillThere.length;
    if (missing > 0) toast(`${missing} từ trong số này đã bị xóa nên sẽ được bỏ qua.`);
    const state: ReplayState = {
      wordIds: log.words.map((w) => w.id).filter((wordId) => stillThere.some((w) => w.id === wordId)),
      timeLimitSec: log.timeLimitSec,
      notes: log.notes,
    };
    void navigate('/speaking', { state });
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Xóa buổi luyện tập này?',
      message: 'Buổi này sẽ bị xóa khỏi lịch sử. Từ vựng của bạn không bị ảnh hưởng.',
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePractice(log.id);
    } catch (err) {
      toast(err instanceof Error ? `Không xóa được: ${err.message}` : 'Không xóa được buổi luyện tập.');
      return;
    }
    toast('Đã xóa buổi luyện tập');
    void navigate('/history', { replace: true });
  };

  return (
    <>
      <PageHeader
        back={{ to: backTo, label: 'Lịch sử' }}
        zh="练习记录"
        title={`${formatDay(log.startedAt)} lúc ${formatTime(log.startedAt)}`}
        description={readOnly && ownerProfile ? `Buổi luyện nói của ${ownerProfile.displayName}.` : undefined}
      />

      <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Thời gian nói" value={formatClock(log.spokenSec)} />
        <Stat label="Giới hạn thời gian" value={formatClock(log.timeLimitSec)} />
        <Stat label="Số từ" value={log.words.length} />
        <Stat
          label={usedCount > 0 ? 'Từ đã dùng' : 'Kết thúc'}
          value={usedCount > 0 ? `${usedCount}/${log.words.length}` : log.endedEarly ? 'Sớm' : 'Đúng giờ'}
        />
      </dl>

      <section aria-labelledby="words-heading">
        <h2 id="words-heading" className="mb-3 font-semibold">
          Các từ đã luyện
        </h2>
        <PracticeWordList words={log.words} showUsed={usedCount > 0} imagePaths={imagePaths} />
      </section>

      {log.notes && (
        <section className={cn(panelClass, 'mt-6 rounded-2xl p-5')}>
          <h2 className="font-semibold">Ghi chú</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-muted">
            <MixedText>{log.notes}</MixedText>
          </p>
        </section>
      )}

      {!readOnly && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={practiceAgain} className={buttonClass('primary', 'lg')}>
            <Mic /> Luyện lại các từ này
          </button>
          <button type="button" onClick={() => void remove()} className={buttonClass('danger', 'lg')}>
            <Trash2 /> Xóa buổi luyện tập
          </button>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={cn(panelClass, 'rounded-2xl px-4 py-3')}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
