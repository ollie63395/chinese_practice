import { BookOpen, History, KeyRound, ShieldCheck, ShieldMinus, SearchX } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { PracticeHistory } from '../components/PracticeHistory';
import {
  buttonClass,
  EmptyState,
  ErrorNotice,
  Field,
  inputClass,
  PageHeader,
  PageLoader,
  panelClass,
  Segmented,
} from '../components/ui';
import { WordBrowser } from '../components/WordBrowser';
import { useAccount } from '../db/auth';
import { useAccountSummaries, usePractices, useTagCounts, useWords } from '../db/hooks';
import { resetStudentPassword, setAccountRole } from '../db/profiles';
import type { AccountSummary } from '../db/types';
import { loginLabel, MIN_PASSWORD_LENGTH } from '../lib/accounts';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { formatDuration } from '../lib/time';
import { NotFoundPage } from './ErrorPages';
import { Avatar } from './StudentsPage';

/** Teachers only: one account's words and practice history, read-only, and managing the account. */
export function StudentPage() {
  const { isTeacher } = useAccount();
  const { studentId = '' } = useParams();
  return isTeacher ? <StudentView key={studentId} id={studentId} /> : <NotFoundPage />;
}

function StudentView({ id }: { id: string }) {
  const accounts = useAccountSummaries();
  const account = accounts?.find((a) => a.id === id);
  useDocumentTitle(account?.displayName ?? 'Học viên');

  if (!accounts) return <PageLoader />;
  if (!account) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Không tìm thấy tài khoản này"
        action={
          <Link to="/students" className={buttonClass('secondary')}>
            Quay lại danh sách học viên
          </Link>
        }
      />
    );
  }
  return <StudentDetails account={account} />;
}

function StudentDetails({ account }: { account: AccountSummary }) {
  const me = useAccount().id;
  const words = useWords(account.id);
  const practices = usePractices(account.id);
  const tags = useTagCounts(words);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'history' ? 'history' : 'words';
  const [resetting, setResetting] = useState(false);
  const isMe = account.id === me;
  const isStudent = account.role === 'student';

  return (
    <>
      <PageHeader
        back={{ to: '/students', label: 'Học viên' }}
        zh={isStudent ? '学生' : '老师'}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={account.displayName} />
            <span className="min-w-0">{account.displayName}</span>
          </span>
        }
        description={`${isStudent ? 'Học viên' : 'Giáo viên'} · ${loginLabel(account)}${isMe ? ' (bạn)' : ''}`}
        actions={!isMe && <AccountActions account={account} onReset={() => setResetting((r) => !r)} resetting={resetting} />}
      />

      {resetting && isStudent && <ResetPasswordForm account={account} onDone={() => setResetting(false)} />}

      <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Từ vựng" value={account.wordCount} />
        <Stat label="Nhãn" value={words ? tags.length : '…'} />
        <Stat label="Buổi luyện nói" value={account.practiceCount} />
        <Stat label="Thời gian đã nói" value={formatDuration(account.spokenSec)} />
      </dl>

      <div className="mb-5">
        <Segmented
          label="Xem"
          value={tab}
          onChange={(value) => {
            const next = new URLSearchParams(params);
            if (value === 'history') next.set('tab', 'history');
            else next.delete('tab');
            setParams(next, { replace: true });
          }}
          options={[
            { value: 'words', label: `Từ vựng (${account.wordCount})` },
            { value: 'history', label: `Lịch sử luyện tập (${account.practiceCount})` },
          ]}
        />
      </div>

      {tab === 'words' ? (
        !words ? (
          <PageLoader />
        ) : words.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="Chưa có từ nào">
            {account.displayName} chưa thêm từ nào vào kho từ vựng.
          </EmptyState>
        ) : (
          <WordBrowser words={words} readOnly />
        )
      ) : !practices ? (
        <PageLoader />
      ) : practices.length === 0 ? (
        <EmptyState icon={<History />} title="Chưa có buổi luyện tập nào">
          {account.displayName} chưa hoàn thành buổi luyện nói nào.
        </EmptyState>
      ) : (
        <PracticeHistory practices={practices} linkTo={(log) => `/students/${account.id}/history/${log.id}`} />
      )}
    </>
  );
}

interface AccountActionsProps {
  account: AccountSummary;
  resetting: boolean;
  onReset: () => void;
}

function AccountActions({ account, resetting, onReset }: AccountActionsProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const isStudent = account.role === 'student';

  const changeRole = async () => {
    const ok = await confirm(
      isStudent
        ? {
            title: `Đặt ${account.displayName} làm giáo viên?`,
            message:
              'Giáo viên xem được từ vựng và lịch sử luyện tập của mọi học viên, và có thể đặt lại mật khẩu cho học viên.',
            confirmLabel: 'Đặt làm giáo viên',
          }
        : {
            title: `Chuyển ${account.displayName} thành học viên?`,
            message: 'Người này sẽ không còn xem được dữ liệu của học viên khác.',
            confirmLabel: 'Chuyển thành học viên',
            danger: true,
          },
    );
    if (!ok) return;
    try {
      await setAccountRole(account.id, isStudent ? 'teacher' : 'student');
      toast(isStudent ? `${account.displayName} giờ là giáo viên` : `${account.displayName} giờ là học viên`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không đổi được vai trò.');
    }
  };

  return (
    <>
      {isStudent && (
        <button type="button" aria-expanded={resetting} onClick={onReset} className={buttonClass('secondary')}>
          <KeyRound /> Đặt lại mật khẩu
        </button>
      )}
      <button type="button" onClick={() => void changeRole()} className={buttonClass(isStudent ? 'secondary' : 'danger')}>
        {isStudent ? <ShieldCheck /> : <ShieldMinus />} {isStudent ? 'Đặt làm giáo viên' : 'Chuyển thành học viên'}
      </button>
    </>
  );
}

function ResetPasswordForm({ account, onDone }: { account: AccountSummary; onDone: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setProblem(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    setBusy(true);
    try {
      await resetStudentPassword(account.id, password);
      toast(`Đã đặt mật khẩu mới cho ${account.displayName}`);
      onDone();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Không đặt lại được mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className={cn(panelClass, 'mb-6 animate-rise space-y-3 p-5')}>
      <Field
        label={`Mật khẩu mới cho ${account.displayName}`}
        htmlFor="student-password"
        hint="Hãy báo mật khẩu này cho học viên. Họ có thể tự đổi lại trong mục Tài khoản."
      >
        <input
          id="student-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          className={inputClass}
        />
      </Field>
      {problem && <ErrorNotice>{problem}</ErrorNotice>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={buttonClass('primary')}>
          <KeyRound /> Lưu mật khẩu mới
        </button>
        <button type="button" onClick={onDone} className={buttonClass('ghost')}>
          Hủy
        </button>
      </div>
    </form>
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
