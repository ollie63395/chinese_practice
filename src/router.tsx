import { createHashRouter } from 'react-router';
import { Layout } from './components/Layout';
import { BackupPage } from './pages/BackupPage';
import { NotFoundPage, RouteErrorPage } from './pages/ErrorPages';
import { FlashcardsReviewPage } from './pages/FlashcardsReviewPage';
import { FlashcardsSetupPage } from './pages/FlashcardsSetupPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { SpeakingPage } from './pages/speaking/SpeakingPage';
import { WordFormPage } from './pages/WordFormPage';
import { WordsPage } from './pages/WordsPage';

// Hash URLs (#/words) work on any static host without server rewrite rules.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'words', element: <WordsPage /> },
      { path: 'words/new', element: <WordFormPage /> },
      { path: 'words/:id', element: <WordFormPage /> },
      { path: 'flashcards', element: <FlashcardsSetupPage /> },
      { path: 'flashcards/review', element: <FlashcardsReviewPage /> },
      { path: 'speaking', element: <SpeakingPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'history/:id', element: <HistoryDetailPage /> },
      { path: 'backup', element: <BackupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
