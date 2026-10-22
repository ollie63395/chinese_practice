import { BookOpen, DatabaseBackup, History, Layers, LogOut, Mic, Plus, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { AccountContext, signOut, useSession, type Account } from '../db/auth';
import { useProfile } from '../db/hooks';
import { cn } from '../lib/cn';
import { isConfigured, takePasswordResetPending } from '../lib/supabase';
import { SetPasswordScreen } from '../pages/AccountPage';
import { AuthPage } from '../pages/AuthPage';
import { BACKUP_TITLE } from '../pages/BackupPage';
import { ConfirmProvider, ToastProvider } from './feedback';
import { buttonClass, EmptyState, PageLoader } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  isActive: (path: string) => boolean;
}

const NAV: NavItem[] = [
  {
    to: '/words',
    label: 'Từ vựng',
    icon: BookOpen,
    isActive: (p) => p === '/words' || (p.startsWith('/words/') && p !== '/words/new'),
  },
  { to: '/flashcards', label: 'Thẻ ghi nhớ', icon: Layers, isActive: (p) => p.startsWith('/flashcards') },
  { to: '/speaking', label: 'Luyện nói', icon: Mic, isActive: (p) => p.startsWith('/speaking') },
  { to: '/history', label: 'Lịch sử', icon: History, isActive: (p) => p.startsWith('/history') },
];

const STUDENTS: NavItem = { to: '/students', label: 'Học viên', icon: Users, isActive: (p) => p.startsWith('/students') };

export function Layout() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Shell />
        <ScrollRestoration />
      </ConfirmProvider>
    </ToastProvider>
  );
}

/** The app for whoever is signed in, or the sign-in page. */
function Shell() {
  const session = useSession();
  if (!isConfigured) {
    return (
      <Frame>
        <EmptyState icon={<DatabaseBackup />} title="Chưa kết nối được máy chủ">
          Trang web này được dựng khi chưa có thông tin máy chủ Supabase (VITE_SUPABASE_URL và
          VITE_SUPABASE_PUBLISHABLE_KEY). Hãy thêm chúng vào biến môi trường rồi dựng lại.
        </EmptyState>
      </Frame>
    );
  }
  if (session === undefined) return <Frame>{<PageLoader />}</Frame>;
  if (!session) {
    return (
      <Frame>
        <AuthPage />
      </Frame>
    );
  }
  // Keyed by account, so nothing carries over when someone else signs in on this device.
  return <SignedIn key={session.user.id} userId={session.user.id} />;
}

function SignedIn({ userId }: { userId: string }) {
  const profile = useProfile(userId);
  const [settingPassword, setSettingPassword] = useState(takePasswordResetPending);
  const account = useMemo<Account | null>(
    () => (profile ? { id: userId, profile, isTeacher: profile.role === 'teacher' } : null),
    [userId, profile],
  );

  if (profile === undefined) return <Frame>{<PageLoader />}</Frame>;
  if (!account) {
    return (
      <Frame>
        <EmptyState
          icon={<UserRound />}
          title="Không tìm thấy hồ sơ tài khoản"
          action={
            <button type="button" onClick={() => void signOut()} className={buttonClass('primary')}>
              <LogOut /> Đăng xuất
            </button>
          }
        >
          Tài khoản này chưa có hồ sơ trên máy chủ. Hãy đăng xuất rồi thử lại, hoặc báo cho giáo viên.
        </EmptyState>
      </Frame>
    );
  }

  return (
    <AccountContext value={account}>
      {settingPassword ? (
        <Frame>
          <SetPasswordScreen onDone={() => setSettingPassword(false)} />
        </Frame>
      ) : (
        <AppFrame account={account} />
      )}
    </AccountContext>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg font-semibold" aria-label="Trang chủ Qinglan Chinese Class">
      <img src="favicon.svg" alt="" className="size-8 rounded-lg shadow-sm ring-1 ring-line" />
      <span className="text-lg tracking-tight">Qinglan Chinese Class</span>
    </Link>
  );
}

/** The page frame without navigation: for signing in, loading, and messages. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Brand />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">{children}</main>
    </div>
  );
}

function AppFrame({ account }: { account: Account }) {
  const { pathname } = useLocation();
  const nav = account.isTeacher ? [...NAV, STUDENTS] : NAV;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Brand />
          <nav aria-label="Điều hướng chính" className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    active ? 'bg-card text-ink shadow-xs ring-1 ring-line' : 'text-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            {/* The phone's bottom bar has no room for the teacher's page, so it lives up here. */}
            {account.isTeacher && (
              <Link
                to="/students"
                title="Học viên"
                aria-label="Học viên"
                aria-current={STUDENTS.isActive(pathname) ? 'page' : undefined}
                className={buttonClass('ghost', 'icon', 'md:hidden')}
              >
                <Users />
              </Link>
            )}
            <Link
              to="/backup"
              title={BACKUP_TITLE}
              aria-label={BACKUP_TITLE}
              aria-current={pathname === '/backup' ? 'page' : undefined}
              className={buttonClass('ghost', 'icon')}
            >
              <DatabaseBackup />
            </Link>
            <Link
              to="/account"
              title={`Tài khoản: ${account.profile.displayName}`}
              aria-label="Tài khoản"
              aria-current={pathname === '/account' ? 'page' : undefined}
              className={buttonClass('ghost', 'icon')}
            >
              <UserRound />
            </Link>
            {/* On phones the bottom bar has its own add button. */}
            <Link to="/words/new" className={buttonClass('primary', 'sm', 'max-md:hidden')}>
              <Plus /> Thêm từ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
        <Outlet />
      </main>

      <MobileNav pathname={pathname} />
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const tab = (item: NavItem) => {
    const active = item.isActive(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
          active ? 'text-accent-ink' : 'text-muted',
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2">
        {NAV.slice(0, 2).map(tab)}
        <Link
          to="/words/new"
          aria-label="Thêm từ"
          aria-current={pathname === '/words/new' ? 'page' : undefined}
          className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-on-accent shadow-md shadow-accent/30 transition active:scale-95"
        >
          <Plus className="size-6" />
        </Link>
        {NAV.slice(2).map(tab)}
      </div>
    </nav>
  );
}
