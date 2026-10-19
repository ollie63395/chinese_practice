import { expect, test, type Page } from '@playwright/test';
import { nav, otherDevice, PASSWORD, signIn, signUp } from './helpers';

const MAILPIT = 'http://127.0.0.1:54324';

/** The link in the newest email sent to `to`, from local Supabase's test inbox (Mailpit). */
async function emailLink(page: Page, to: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await page.request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } });
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = await (await page.request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      const href = /href="([^"]+)"/.exec(message.HTML as string)?.[1];
      if (href) return href.replaceAll('&amp;', '&');
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`No email for ${to}`);
}

async function openAuthTab(page: Page, tab: 'Đăng nhập' | 'Tạo tài khoản') {
  await page.getByRole('group', { name: 'Đăng nhập hoặc tạo tài khoản' }).getByRole('button', { name: tab }).click();
}

test('signs up with an email, stays signed in, signs out and back in', async ({ page }) => {
  const account = await signUp(page, { kind: 'email', name: 'Lê Minh' });
  await page.reload();
  await expect(nav(page)).toBeVisible();

  await page.getByRole('link', { name: 'Tài khoản' }).click();
  await expect(page.getByText(`Đăng nhập bằng ${account.login}.`)).toBeVisible();
  await expect(page.getByText('Học viên', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('heading', { name: 'Chào mừng bạn đến với Cíhuì' })).toBeVisible();

  await page.locator('#login').fill(account.login);
  await page.locator('#password').fill('sai-mat-khau');
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('alert')).toHaveText('Sai email/tên đăng nhập hoặc mật khẩu.');
  await signIn(page, account);
});

test('signs up with a username, checking what is typed, and keeps usernames unique', async ({ page, browser }) => {
  await page.goto('/');
  await openAuthTab(page, 'Tạo tài khoản');
  await page.getByRole('group', { name: 'Đăng nhập bằng' }).getByRole('button', { name: 'Tên đăng nhập' }).click();
  await page.locator('#new-login').fill('có dấu');
  await page.locator('#new-password').fill('123');
  await page.locator('form').getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByRole('alert')).toHaveText([
    'Hãy nhập tên của bạn.',
    'Tên đăng nhập cần 3–30 ký tự: chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.',
    'Mật khẩu cần ít nhất 6 ký tự.',
  ]);

  const account = await signUp(page, { name: 'Trần Thị Bình' });

  const other = await otherDevice(browser, page);
  await other.goto('/');
  await openAuthTab(other, 'Tạo tài khoản');
  await other.locator('#new-name').fill('Người khác');
  await other.getByRole('group', { name: 'Đăng nhập bằng' }).getByRole('button', { name: 'Tên đăng nhập' }).click();
  await other.locator('#new-login').fill(account.login);
  await other.locator('#new-password').fill(PASSWORD);
  await other.locator('form').getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(other.getByRole('alert')).toHaveText('Email hoặc tên đăng nhập này đã có người dùng.');

  // Usernames don't care about capitals.
  await openAuthTab(other, 'Đăng nhập');
  await signIn(other, { login: account.login.toUpperCase(), password: PASSWORD });
  await other.context().close();
});

test('renames the account and changes the password', async ({ page }) => {
  const account = await signUp(page);
  await page.goto('/#/account');
  await page.locator('#display-name').fill('An Nguyễn');
  await page.getByRole('button', { name: 'Lưu tên' }).click();
  await expect(page.getByText('Đã lưu tên')).toBeVisible();

  await page.locator('#new-password').fill('mat-khau-moi');
  await page.locator('#new-password-again').fill('khac-nhau');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await expect(page.getByRole('alert')).toHaveText('Hai mật khẩu chưa giống nhau.');
  await page.locator('#new-password-again').fill('mat-khau-moi');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await expect(page.getByText('Đã đổi mật khẩu')).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await signIn(page, { login: account.login, password: 'mat-khau-moi' });
  await page.goto('/#/account');
  await expect(page.locator('#display-name')).toHaveValue('An Nguyễn');
});

test('resets a forgotten password with an emailed link, which works only once', async ({ page }) => {
  const account = await signUp(page, { kind: 'email' });
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Đăng xuất' }).click();

  await page.getByRole('button', { name: 'Quên mật khẩu?' }).click();
  await page.locator('#reset-email').fill(account.login);
  await page.getByRole('button', { name: 'Gửi liên kết' }).click();
  await expect(page.getByRole('status')).toContainText('liên kết đặt lại mật khẩu đã được gửi');

  const link = await emailLink(page, account.login);
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Đặt mật khẩu mới' })).toBeVisible();
  await page.locator('#new-password').fill('mat-khau-moi');
  await page.locator('#new-password-again').fill('mat-khau-moi');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await expect(page.getByText('Đã đặt mật khẩu mới')).toBeVisible();
  await expect(nav(page)).toBeVisible();
  // A reload doesn't ask again.
  await page.reload();
  await expect(nav(page)).toBeVisible();

  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await signIn(page, { login: account.login, password: 'mat-khau-moi' });

  // The same link again: already used.
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.goto(link);
  await expect(page.getByRole('alert')).toContainText('Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng');
});

test('a username account is told to ask a teacher for a new password', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Quên mật khẩu?' }).click();
  await page.locator('#reset-email').fill('binh_01');
  await page.getByRole('button', { name: 'Gửi liên kết' }).click();
  await expect(page.getByRole('alert')).toContainText('Hãy nhờ giáo viên đặt lại mật khẩu cho bạn.');
});
