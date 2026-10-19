import { KeyRound, LogOut, UserRound } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useToast } from '../components/feedback';
import { buttonClass, ErrorNotice, Field, inputClass, PageHeader, panelClass } from '../components/ui';
import { signOut, useAccount } from '../db/auth';
import { changeMyPassword, renameMe } from '../db/profiles';
import { loginLabel, MIN_PASSWORD_LENGTH } from '../lib/accounts';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';

export function AccountPage() {
  useDocumentTitle('Tài khoản');
  const { profile, isTeacher } = useAccount();
  const toast = useToast();
  const [name, setName] = useState(profile.displayName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = name.trim().replace(/\s+/g, ' ');
    if (!displayName) {
      setNameError('Hãy nhập tên của bạn.');
      return;
    }
    setSaving(true);
    try {
      await renameMe(displayName);
      setName(displayName);
      setNameError(null);
      toast('Đã lưu tên');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Không lưu được tên.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader zh="账户" title="Tài khoản" description={`Đăng nhập bằng ${loginLabel(profile)}.`} />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel icon={<UserRound />} title="Thông tin của bạn">
          <p className="mb-4 text-sm text-muted">
            <span className="mr-2 inline-flex rounded-full bg-ai-soft px-2.5 py-0.5 text-xs font-medium text-ai">
              {isTeacher ? 'Giáo viên' : 'Học viên'}
            </span>
            {isTeacher
              ? 'Bạn xem được từ vựng và lịch sử luyện tập của mọi học viên.'
              : 'Giáo viên của bạn xem được từ vựng và lịch sử luyện tập của bạn.'}
          </p>
          <form noValidate onSubmit={(event) => void rename(event)} className="space-y-3">
            <Field label="Tên hiển thị" htmlFor="display-name" error={nameError ?? undefined}>
              <input
                id="display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                aria-invalid={!!nameError}
                className={inputClass}
              />
            </Field>
            <button
              type="submit"
              disabled={saving || name.trim() === profile.displayName}
              className={buttonClass('secondary')}
            >
              Lưu tên
            </button>
          </form>
        </Panel>

        <Panel icon={<KeyRound />} title="Đổi mật khẩu">
          <NewPasswordForm onSaved={() => toast('Đã đổi mật khẩu')} />
        </Panel>
      </div>

      <button type="button" onClick={() => void signOut()} className={buttonClass('secondary', 'lg', 'mt-6')}>
        <LogOut /> Đăng xuất
      </button>
      <p className="mt-2 text-sm text-muted">Bạn chỉ đăng xuất trên thiết bị này; dữ liệu vẫn nằm trong tài khoản.</p>
    </>
  );
}

/** Shown after opening a password-reset email, before the rest of the app. */
export function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  useDocumentTitle('Đặt mật khẩu mới');
  const { profile } = useAccount();
  const toast = useToast();
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <p lang="zh-Hans" className="font-zh text-sm font-semibold text-accent-ink">
          设置密码
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Đặt mật khẩu mới</h1>
        <p className="mt-2 text-muted">
          Chọn mật khẩu mới cho tài khoản
          <strong className="block font-semibold wrap-anywhere text-ink">{loginLabel(profile)}</strong>
        </p>
      </div>
      <section className={cn(panelClass, 'p-5 md:p-7')}>
        <NewPasswordForm
          autoFocus
          onSaved={() => {
            toast('Đã đặt mật khẩu mới');
            onDone();
          }}
        />
      </section>
      <p className="mt-4 text-center">
        <button type="button" onClick={onDone} className={buttonClass('ghost', 'sm')}>
          Để sau
        </button>
      </p>
    </div>
  );
}

function NewPasswordForm({ onSaved, autoFocus }: { onSaved: () => void; autoFocus?: boolean }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setProblem(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (password !== again) {
      setProblem('Hai mật khẩu chưa giống nhau.');
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      await changeMyPassword(password);
      setPassword('');
      setAgain('');
      onSaved();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Không đổi được mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-3">
      <Field label="Mật khẩu mới" htmlFor="new-password" hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className={inputClass}
        />
      </Field>
      <Field label="Nhập lại mật khẩu mới" htmlFor="new-password-again">
        <input
          id="new-password-again"
          type="password"
          value={again}
          onChange={(event) => setAgain(event.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      {problem && <ErrorNotice>{problem}</ErrorNotice>}
      <button type="submit" disabled={busy} className={buttonClass('primary')}>
        <KeyRound /> {busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
      </button>
    </form>
  );
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={cn(panelClass, 'p-5 md:p-6')}>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-ink [&_svg]:size-[18px]">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
