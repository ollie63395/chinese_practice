import { ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, PageHeader, PageLoader, SearchInput } from '../components/ui';
import { useAccount } from '../db/auth';
import { useAccountSummaries } from '../db/hooks';
import type { AccountSummary } from '../db/types';
import { loginLabel } from '../lib/accounts';
import { useDocumentTitle } from '../lib/hooks';
import { fold } from '../lib/search';
import { formatDay, formatDuration } from '../lib/time';
import { NotFoundPage } from './ErrorPages';

/** Teachers only: every account, to open a student's words and practice history. */
export function StudentsPage() {
  const { isTeacher } = useAccount();
  return isTeacher ? <StudentList /> : <NotFoundPage />;
}

function StudentList() {
  useDocumentTitle('Học viên');
  const me = useAccount().id;
  const accounts = useAccountSummaries();
  const [query, setQuery] = useState('');

  if (!accounts) return <PageLoader />;

  const q = fold(query.trim());
  const matching = accounts.filter((a) => !q || fold(a.displayName).includes(q) || fold(loginLabel(a)).includes(q));
  const students = matching.filter((a) => a.role === 'student');
  const teachers = matching.filter((a) => a.role === 'teacher');
  const studentCount = accounts.filter((a) => a.role === 'student').length;

  return (
    <>
      <PageHeader
        zh="学生"
        title="Học viên"
        description={
          studentCount > 0
            ? `${studentCount} học viên. Mở một học viên để xem từ vựng và lịch sử luyện tập của họ.`
            : undefined
        }
      />
      {studentCount === 0 ? (
        <EmptyState icon={<Users />} title="Chưa có học viên nào">
          Khi học viên tạo tài khoản trên Qinglan Chinese Class, họ sẽ hiện ở đây.
        </EmptyState>
      ) : (
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} label="Tìm học viên" placeholder="Tên, email hoặc tên đăng nhập" />
        </div>
      )}
      <div className="space-y-8">
        {students.length > 0 && <AccountGroup title={`Học viên (${students.length})`} accounts={students} me={me} />}
        {teachers.length > 0 && <AccountGroup title={`Giáo viên (${teachers.length})`} accounts={teachers} me={me} />}
        {matching.length === 0 && (
          <p className="rounded-3xl border border-dashed border-line px-6 py-12 text-center text-muted">
            Không có ai khớp với “{query}”.
          </p>
        )}
      </div>
    </>
  );
}

function AccountGroup({ title, accounts, me }: { title: string; accounts: AccountSummary[]; me: string }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>
      <ul className="grid gap-2 md:grid-cols-2">
        {accounts.map((account) => (
          <AccountRow key={account.id} account={account} isMe={account.id === me} />
        ))}
      </ul>
    </section>
  );
}

function AccountRow({ account, isMe }: { account: AccountSummary; isMe: boolean }) {
  return (
    <li className="group relative flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-xs transition hover:border-accent/30">
      <Avatar name={account.displayName} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/students/${account.id}`}
          className="font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
        >
          {account.displayName}
        </Link>
        {isMe && <span className="ml-1.5 text-sm text-muted">(bạn)</span>}
        <p className="truncate py-0.5 text-sm text-muted">{loginLabel(account)}</p>
        <p className="text-sm text-muted">
          {account.wordCount} từ · {account.practiceCount} buổi luyện nói
          {account.lastPracticeAt !== null && ` · gần nhất: ${formatDay(account.lastPracticeAt).toLowerCase()}`}
          {account.spokenSec > 0 && ` · đã nói ${formatDuration(account.spokenSec)}`}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </li>
  );
}

/** A circle with the first letter of the given name (the last word, in a Vietnamese name). */
export function Avatar({ name }: { name: string }) {
  const given = name.trim().split(/\s+/).at(-1) ?? '';
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-ai-soft text-lg font-semibold text-ai"
    >
      {[...given][0]?.toUpperCase() ?? '?'}
    </span>
  );
}
