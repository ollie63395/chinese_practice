import { BookOpen, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClass, EmptyState, PageHeader, PageLoader } from '../components/ui';
import { WordBrowser } from '../components/WordBrowser';
import { useTagCounts, useWords } from '../db/hooks';
import { useDocumentTitle } from '../lib/hooks';

export function WordsPage() {
  useDocumentTitle('Từ vựng');
  const words = useWords();
  const tags = useTagCounts(words);

  if (!words) return <PageLoader />;

  const addButton = (
    <Link to="/words/new" className={buttonClass('primary')}>
      <Plus /> Thêm từ
    </Link>
  );

  if (words.length === 0) {
    return (
      <>
        <PageHeader zh="生词本" title="Từ vựng của bạn" />
        <EmptyState icon={<BookOpen />} title="Kho từ vựng đang trống" action={addButton}>
          Hãy thêm từ đầu tiên bạn học hôm nay. Sau đó bạn có thể ôn nó bằng thẻ ghi nhớ và dùng nó khi luyện nói.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        zh="生词本"
        title="Từ vựng của bạn"
        description={`Kho của bạn có ${words.length} từ${tags.length ? `, gắn ${tags.length} nhãn` : ''}.`}
        actions={addButton}
      />
      <WordBrowser words={words} />
    </>
  );
}
