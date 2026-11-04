import { BookOpen, FileSpreadsheet, Plus, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useToast } from '../components/feedback';
import { buttonClass, EmptyState, FloatingBar, PageHeader, PageLoader } from '../components/ui';
import { WordBrowser } from '../components/WordBrowser';
import { useTagCounts, useWords } from '../db/hooks';
import type { Word } from '../db/types';
import { deleteWords, removeWordImages, restoreWords } from '../db/words';
import { useDocumentTitle } from '../lib/hooks';

/**
 * Deleting many words at once. It can be undone until the next such deletion or until leaving the
 * page: their pictures are only removed then. (If the tab is closed first, the pictures stay behind
 * as unused files, which does no harm.)
 */
function useDeleteMany() {
  const toast = useToast();
  const [undoable, setUndoable] = useState<Word[] | null>(null);
  const [undoing, setUndoing] = useState(false);
  // What the clean-up on leaving the page has to deal with.
  const pending = useRef<Word[] | null>(null);

  const settle = useCallback(() => {
    if (pending.current) void removeWordImages(pending.current);
    pending.current = null;
    setUndoable(null);
  }, []);

  useEffect(
    () => () => {
      if (pending.current) void removeWordImages(pending.current);
      pending.current = null;
    },
    [],
  );

  const deleteMany = async (targets: Word[]): Promise<boolean> => {
    const { deleted, error } = await deleteWords(targets.map((w) => w.id));
    if (deleted.length > 0) {
      settle();
      pending.current = deleted;
      setUndoable(deleted);
    }
    if (error) {
      toast(
        deleted.length > 0
          ? `Đã xóa ${deleted.length}/${targets.length} từ thì gặp lỗi: ${error.message}`
          : `Không xóa được: ${error.message}`,
      );
    }
    return !error;
  };

  const undo = async () => {
    const restoring = pending.current;
    if (!restoring) return;
    // Taken off first, so leaving the page meanwhile can't remove the pictures being brought back.
    pending.current = null;
    setUndoing(true);
    try {
      await restoreWords(restoring);
      setUndoable(null);
      toast(`Đã khôi phục ${restoring.length} từ`);
    } catch (err) {
      pending.current = restoring;
      toast(err instanceof Error ? `Không hoàn tác được: ${err.message}` : 'Không hoàn tác được.');
    } finally {
      setUndoing(false);
    }
  };

  const undoBar = undoable && (
    <>
      {/* Room to scroll the last cards clear of the bar. */}
      <div className="h-16" />
      <FloatingBar>
        <p className="mr-auto text-sm font-medium" role="status">
          Đã xóa {undoable.length} từ
        </p>
        <button type="button" disabled={undoing} onClick={() => void undo()} className={buttonClass('secondary', 'sm')}>
          <Undo2 /> {undoing ? 'Đang hoàn tác…' : 'Hoàn tác'}
        </button>
        <button type="button" disabled={undoing} onClick={settle} aria-label="Đóng" className={buttonClass('ghost', 'icon')}>
          <X />
        </button>
      </FloatingBar>
    </>
  );

  return { deleteMany, settle, undoBar };
}

export function WordsPage() {
  useDocumentTitle('Từ vựng');
  const words = useWords();
  const tags = useTagCounts(words);
  const { deleteMany, settle, undoBar } = useDeleteMany();

  if (!words) return <PageLoader />;

  const addButtons = (
    <>
      <Link to="/words/import" className={buttonClass('secondary')}>
        <FileSpreadsheet /> Nhập từ hàng loạt
      </Link>
      <Link to="/words/new" className={buttonClass('primary')}>
        <Plus /> Thêm từ
      </Link>
    </>
  );

  if (words.length === 0) {
    return (
      <>
        <PageHeader zh="生词本" title="Từ vựng của bạn" />
        <EmptyState icon={<BookOpen />} title="Kho từ vựng đang trống" action={addButtons}>
          Hãy thêm từ đầu tiên bạn học hôm nay, hoặc nhập cả danh sách từ Excel, Google Sheets hay câu trả lời của AI. Sau đó bạn
          có thể ôn chúng bằng thẻ ghi nhớ và dùng chúng khi luyện nói.
        </EmptyState>
        {undoBar}
      </>
    );
  }

  return (
    <>
      <PageHeader
        zh="生词本"
        title="Từ vựng của bạn"
        description={`Kho của bạn có ${words.length} từ${tags.length ? `, gắn ${tags.length} nhãn` : ''}.`}
        actions={addButtons}
      />
      <WordBrowser words={words} onDeleteMany={deleteMany} onStartSelecting={settle} />
      {undoBar}
    </>
  );
}
