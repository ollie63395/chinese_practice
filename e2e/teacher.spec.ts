import { expect, test, type Page } from '@playwright/test';
import { items, makeTeacher, nav, otherDevice, seed, seedPractice, signIn, signUp, WORDS } from './helpers';

/** The teacher's page for one account, found by its login. */
async function openStudent(teacher: Page, login: string, name: string) {
  await teacher.goto('/#/students');
  await teacher.getByLabel('Tìm học viên').fill(login);
  await teacher.getByRole('link', { name }).click();
  await expect(teacher.getByRole('heading', { name })).toBeVisible();
}

test('a teacher sees a student’s words and practice history, but cannot change them', async ({ page, browser }) => {
  const name = `Phạm Thu Hà ${Date.now().toString(36)}`;
  const student = await signUp(page, { name });
  await seed(page, WORDS, [seedPractice(WORDS, 3, 'Kể về 学校 của tôi.')]);

  // Students can't open the teacher's pages.
  await expect(page.getByRole('link', { name: 'Học viên', exact: true })).toHaveCount(0);
  await page.goto('/#/students');
  await expect(page.getByRole('heading', { name: 'Trang này không tồn tại' })).toBeVisible();

  const teacher = await otherDevice(browser, page);
  const teacherAccount = await signUp(teacher, { name: 'Cô Lan' });
  await makeTeacher(teacherAccount.login);
  await teacher.reload();
  await expect(teacher.getByRole('link', { name: 'Học viên', exact: true })).toBeVisible();

  await openStudent(teacher, student.login, name);
  await expect(teacher.getByText(`Học viên · ${student.login}`)).toBeVisible();
  await expect(items(teacher)).toHaveCount(WORDS.length);
  // Read-only: the cards don't lead to the edit page.
  await expect(items(teacher).getByRole('link')).toHaveCount(0);
  await teacher.getByLabel('Tìm từ').fill('truong hoc');
  await expect(items(teacher)).toHaveCount(1);

  await teacher.getByRole('button', { name: /^Lịch sử luyện tập/ }).click();
  await expect(items(teacher)).toHaveCount(1);
  await expect(items(teacher).getByRole('button', { name: /^Xóa/ })).toHaveCount(0);
  await items(teacher).getByRole('link').click();
  await expect(teacher.getByRole('heading', { name: 'Các từ đã luyện' })).toBeVisible();
  await expect(teacher.getByText('Kể về 学校 của tôi.')).toBeVisible();
  await expect(teacher.getByRole('button', { name: 'Xóa buổi luyện tập' })).toHaveCount(0);
  await expect(teacher.getByRole('button', { name: 'Luyện lại các từ này' })).toHaveCount(0);

  // The student's own data is untouched and still theirs to change.
  await page.goto('/#/words');
  await expect(items(page)).toHaveCount(WORDS.length);
  await teacher.context().close();
});

test('a teacher resets a student’s password', async ({ page, browser }) => {
  const name = `Đỗ Văn Nam ${Date.now().toString(36)}`;
  const student = await signUp(page, { name });
  const teacher = await otherDevice(browser, page);
  const teacherAccount = await signUp(teacher, { name: 'Thầy Hùng' });
  await makeTeacher(teacherAccount.login);
  await teacher.reload();

  await openStudent(teacher, student.login, name);
  await teacher.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await teacher.locator('#student-password').fill('moi-123456');
  await teacher.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await expect(teacher.getByText(`Đã đặt mật khẩu mới cho ${name}`)).toBeVisible();

  const laptop = await otherDevice(browser, page);
  await signIn(laptop, { login: student.login, password: 'moi-123456' });
  await laptop.context().close();
  await teacher.context().close();
});

test('a teacher makes a student a teacher, and back', async ({ page, browser }) => {
  const name = `Vũ Mai ${Date.now().toString(36)}`;
  const student = await signUp(page, { name });
  const teacher = await otherDevice(browser, page);
  const teacherAccount = await signUp(teacher, { name: 'Cô Hoa' });
  await makeTeacher(teacherAccount.login);
  await teacher.reload();

  await openStudent(teacher, student.login, name);
  await teacher.getByRole('button', { name: 'Đặt làm giáo viên' }).click();
  await expect(teacher.getByRole('dialog')).toContainText('Giáo viên xem được từ vựng và lịch sử luyện tập của mọi học viên');
  await teacher.getByRole('dialog').getByRole('button', { name: 'Đặt làm giáo viên' }).click();
  await expect(teacher.getByText(`${name} giờ là giáo viên`)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('link', { name: 'Học viên', exact: true })).toBeVisible();

  await teacher.getByRole('button', { name: 'Chuyển thành học viên' }).click();
  await teacher.getByRole('dialog').getByRole('button', { name: 'Chuyển thành học viên' }).click();
  await expect(teacher.getByText(`${name} giờ là học viên`)).toBeVisible();
  await page.reload();
  await expect(nav(page)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Học viên', exact: true })).toHaveCount(0);

  // Teachers can't change their own role.
  await teacher.goto('/#/students');
  await teacher.getByLabel('Tìm học viên').fill(teacherAccount.login);
  await teacher.getByRole('link', { name: 'Cô Hoa' }).click();
  await expect(teacher.getByRole('button', { name: 'Chuyển thành học viên' })).toHaveCount(0);
  await teacher.context().close();
});
