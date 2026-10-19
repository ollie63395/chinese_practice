import { History, Mic } from 'lucide-react';
import { Link } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { PracticeHistory } from '../components/PracticeHistory';
import { buttonClass, EmptyState, PageHeader, PageLoader } from '../components/ui';
import { usePractices } from '../db/hooks';
import { deletePractice } from '../db/practices';
import type { PracticeLog } from '../db/types';
import { useDocumentTitle } from '../lib/hooks';
import { formatDay, formatDuration, formatTime } from '../lib/time';

export function HistoryPage() {
  useDocumentTitle('Lịch sử luyện tập');
  const practices = usePractices();
  const confirm = useConfirm();
  const toast = useToast();

  if (!practices) return <PageLoader />;

  const header = (
    <PageHeader
      zh="练习记录"
      title="Lịch sử luyện tập"
      description={
        practices.length > 0
          ? `${practices.length} buổi luyện nói, tổng thời gian nói ${formatDuration(practices.reduce((t, p) => t + p.spokenSec, 0))}.`
          : undefined
      }
    />
  );

  if (practices.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<History />}
          title="Chưa có buổi luyện tập nào"
          action={
            <Link to="/speaking" className={buttonClass('primary')}>
              <Mic /> Bắt đầu luyện nói
            </Link>
          }
        >
          Mỗi buổi luyện nói bạn hoàn thành sẽ được ghi lại ở đây, cùng với các từ bạn đã dùng.
        </EmptyState>
      </>
    );
  }

  const remove = async (log: PracticeLog) => {
    const ok = await confirm({
      title: 'Xóa buổi luyện tập này?',
      message: `Buổi luyện tập ${formatDay(log.startedAt).toLowerCase()} lúc ${formatTime(log.startedAt)} sẽ bị xóa khỏi lịch sử. Từ vựng của bạn không bị ảnh hưởng.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePractice(log.id);
      toast('Đã xóa buổi luyện tập');
    } catch (err) {
      toast(err instanceof Error ? `Không xóa được: ${err.message}` : 'Không xóa được buổi luyện tập.');
    }
  };

  return (
    <>
      {header}
      <PracticeHistory practices={practices} linkTo={(log) => `/history/${log.id}`} onDelete={(log) => void remove(log)} />
    </>
  );
}
