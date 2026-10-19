import { LogIn, MailCheck, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { buttonClass, ErrorNotice, Field, inputClass, panelClass, Segmented } from '../components/ui';
import {
  isEmail,
  isValidUsername,
  loginToEmail,
  MIN_PASSWORD_LENGTH,
  normalizeUsername,
  USERNAME_DOMAIN,
} from '../lib/accounts';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/errors';
import { useDocumentTitle } from '../lib/hooks';
import { SET_PASSWORD_PARAM, supabase, takeLinkError } from '../lib/supabase';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

/** Shown instead of the app until someone signs in. */
export function AuthPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [linkError] = useState(() =>
    takeLinkError() ? 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy gửi lại một liên kết mới.' : null,
  );
  useDocumentTitle(mode === 'sign-up' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Quên mật khẩu' : 'Đăng nhập');

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <p lang="zh-Hans" className="font-zh text-sm font-semibold text-accent-ink">
          {mode === 'sign-up' ? '注册' : mode === 'forgot' ? '找回密码' : '欢迎'}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {mode === 'sign-up' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Quên mật khẩu' : 'Chào mừng bạn đến với Cíhuì'}
        </h1>
        <p className="mt-2 text-muted">
          {mode === 'forgot'
            ? 'Nhập email của tài khoản để nhận liên kết đặt lại mật khẩu.'
            : 'Từ vựng và lịch sử luyện tập được lưu trong tài khoản, nên bạn dùng được trên mọi thiết bị.'}
        </p>
      </div>

      {mode !== 'forgot' && (
        <div className="mb-4 flex justify-center">
          <Segmented
            label="Đăng nhập hoặc tạo tài khoản"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'sign-in', label: 'Đăng nhập' },
              { value: 'sign-up', label: 'Tạo tài khoản' },
            ]}
          />
        </div>
      )}

      <section className={cn(panelClass, 'p-5 md:p-7')}>
        {linkError && mode !== 'sign-up' && (
          <div className="mb-5">
            <ErrorNotice>{linkError}</ErrorNotice>
          </div>
        )}
        {mode === 'sign-in' && <SignInForm onForgot={() => setMode('forgot')} />}
        {mode === 'sign-up' && <SignUpForm />}
        {mode === 'forgot' && <ForgotForm onBack={() => setMode('sign-in')} />}
      </section>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!login.trim() || !password) {
      setProblem('Hãy nhập email (hoặc tên đăng nhập) và mật khẩu.');
      return;
    }
    setBusy(true);
    setProblem(null);
    const { error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password });
    setBusy(false);
    // On success the app appears by itself.
    if (error) setProblem(errorMessage(error));
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <Field label="Email hoặc tên đăng nhập" htmlFor="login">
        <input
          id="login"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          className={inputClass}
        />
      </Field>
      <Field label="Mật khẩu" htmlFor="password">
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      {problem && <ErrorNotice>{problem}</ErrorNotice>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass('primary', 'lg')}>
          <LogIn /> {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <button type="button" onClick={onForgot} className={buttonClass('ghost', 'lg')}>
          Quên mật khẩu?
        </button>
      </div>
    </form>
  );
}

type SignUpField = 'name' | 'login' | 'password';

function SignUpForm() {
  const [name, setName] = useState('');
  const [method, setMethod] = useState<'email' | 'username'>('email');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<SignUpField, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = name.trim().replace(/\s+/g, ' ');
    const username = normalizeUsername(login);
    const email = login.trim().toLowerCase();
    const next: typeof errors = {};
    if (!displayName) next.name = 'Hãy nhập tên của bạn.';
    if (method === 'email' && !/^\S+@\S+\.\S+$/.test(email)) next.login = 'Hãy nhập một địa chỉ email hợp lệ.';
    if (method === 'email' && email.endsWith(`@${USERNAME_DOMAIN}`)) next.login = 'Hãy nhập một địa chỉ email hợp lệ.';
    if (method === 'username' && !isValidUsername(username)) {
      next.login = 'Tên đăng nhập cần 3–30 ký tự: chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) next.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
    setErrors(next);
    const firstInvalid = (['name', 'login', 'password'] as const).find((field) => next[field]);
    if (firstInvalid) {
      document.getElementById(`new-${firstInvalid}`)?.focus();
      return;
    }

    setBusy(true);
    setProblem(null);
    const { error } = await supabase.auth.signUp({
      email: method === 'email' ? email : loginToEmail(username),
      password,
      options: { data: { display_name: displayName } },
    });
    setBusy(false);
    if (error) setProblem(errorMessage(error));
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <Field label="Tên của bạn" htmlFor="new-name" error={errors.name} hint="Giáo viên sẽ thấy tên này.">
        <input
          id="new-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nguyễn Văn An"
          autoComplete="name"
          maxLength={80}
          autoFocus
          aria-invalid={!!errors.name}
          className={inputClass}
        />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Đăng nhập bằng</p>
        <Segmented
          label="Đăng nhập bằng"
          value={method}
          onChange={(value) => {
            setMethod(value);
            setErrors((e) => ({ ...e, login: undefined }));
          }}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'username', label: 'Tên đăng nhập' },
          ]}
        />
      </div>
      <Field
        label={method === 'email' ? 'Email' : 'Tên đăng nhập'}
        htmlFor="new-login"
        error={errors.login}
        hint={
          method === 'email'
            ? 'Dùng để đăng nhập và để lấy lại mật khẩu nếu bạn quên.'
            : 'Chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới. Không có email thì không tự lấy lại mật khẩu được: khi quên, hãy nhờ giáo viên đặt lại.'
        }
      >
        <input
          key={method}
          id="new-login"
          type={method === 'email' ? 'email' : 'text'}
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          placeholder={method === 'email' ? 'ban@example.com' : 'nguyen.an'}
          autoComplete={method === 'email' ? 'email' : 'username'}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!errors.login}
          className={inputClass}
        />
      </Field>
      <Field label="Mật khẩu" htmlFor="new-password" error={errors.password} hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          className={inputClass}
        />
      </Field>
      {problem && <ErrorNotice>{problem}</ErrorNotice>}
      <button type="submit" disabled={busy} className={buttonClass('primary', 'lg')}>
        <UserPlus /> {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [login, setLogin] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const email = login.trim().toLowerCase();
    if (!isEmail(email)) {
      setProblem(
        email
          ? 'Tài khoản dùng tên đăng nhập không có email để gửi liên kết. Hãy nhờ giáo viên đặt lại mật khẩu cho bạn.'
          : 'Hãy nhập email của tài khoản.',
      );
      return;
    }
    setBusy(true);
    setProblem(null);
    const back = new URL(window.location.pathname, window.location.origin);
    back.searchParams.set(SET_PASSWORD_PARAM, '');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: back.toString() });
    setBusy(false);
    if (error) setProblem(errorMessage(error));
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center" role="status">
        <MailCheck className="mx-auto size-8 text-good" />
        <p>
          Nếu <strong>{login.trim()}</strong> có tài khoản, một liên kết đặt lại mật khẩu đã được gửi tới. Hãy kiểm tra
          hộp thư (cả mục Spam) và mở liên kết đó.
        </p>
        <button type="button" onClick={onBack} className={buttonClass('secondary')}>
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <Field
        label="Email"
        htmlFor="reset-email"
        hint="Dùng tên đăng nhập thay cho email? Hãy nhờ giáo viên đặt lại mật khẩu cho bạn."
      >
        <input
          id="reset-email"
          type="email"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          className={inputClass}
        />
      </Field>
      {problem && <ErrorNotice>{problem}</ErrorNotice>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass('primary', 'lg')}>
          {busy ? 'Đang gửi…' : 'Gửi liên kết'}
        </button>
        <button type="button" onClick={onBack} className={buttonClass('ghost', 'lg')}>
          Quay lại đăng nhập
        </button>
      </div>
    </form>
  );
}
