import { expect, test, type Page } from '@playwright/test';
import { ANIMALS, items, makeTeacher, otherDevice, seed, signUp, WORDS } from './helpers';

/** A student's row on an assignment's page. */
const studentRow = (teacher: Page, name: string) =>
  teacher.getByRole('list', { name: 'Học viên' }).getByRole('listitem').filter({ hasText: name });

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test('a teacher gives out speaking practice and sees who has done it', async ({ page, browser }) => {
  // Two accounts on two devices and two timed sessions: longer than most tests.
  test.slow();
  const title = `Kể về trường học ${Date.now().toString(36)}`;
  const name = `Lê Văn Cường ${Date.now().toString(36)}`;
  await page.clock.install();
  const student = await signUp(page, { name });

  const teacher = await otherDevice(browser, page);
  const teacherAccount = await signUp(teacher, { name: 'Cô Mai' });
  await makeTeacher(teacherAccount.login);
  await seed(teacher, WORDS);

  // The teacher gives 3 of their words, 30 seconds, due tomorrow, to the student.
  await teacher.getByRole('link', { name: 'Bài tập', exact: true }).click();
  await teacher.getByRole('link', { name: 'Giao bài mới' }).click();
  await teacher.locator('#assignment-title').fill(title);
  await teacher.locator('#assignment-instructions').fill('Dùng ít nhất hai từ.');
  await teacher.getByLabel('Bốc bao nhiêu từ mỗi lần?').fill('3');
  await teacher.getByRole('button', { name: '30 giây' }).click();
  await teacher.locator('#assignment-due').fill(tomorrow());
  await teacher.getByLabel('Tìm học viên').fill(student.login);
  await teacher.getByRole('checkbox', { name }).check();
  await teacher.getByRole('button', { name: 'Giao bài', exact: true }).click();
  await expect(teacher.getByText('Đã giao bài cho 1 học viên')).toBeVisible();
  await expect(teacher.getByRole('heading', { name: title })).toBeVisible();
  await expect(studentRow(teacher, name)).toContainText('Chưa luyện');

  // The student finds it on the home page, and stopping early only counts as tried.
  await page.goto('/');
  await expect(page.getByRole('region', { name: /Bài tập được giao/ })).toContainText('Chưa luyện');
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByText('Dùng ít nhất hai từ.')).toBeVisible();
  await page.getByRole('button', { name: 'Bốc 3 từ' }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị bài nói' })).toBeVisible();
  // The words can be swapped, but not removed or added, and the time is fixed.
  await expect(page.getByRole('button', { name: /^Đổi .* sang một từ ngẫu nhiên khác$/ })).toHaveCount(3);
  await expect(page.getByRole('button', { name: /^Bỏ / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm một từ', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Bắt đầu nói · 0:30/ }).click();
  await page.clock.fastForward(5_000);
  await page.getByRole('button', { name: 'Kết thúc' }).click();
  await expect(page.getByText(/Hãy nói đủ 30\sgiây để hoàn thành bài tập/)).toBeVisible();

  await teacher.reload();
  await expect(studentRow(teacher, name)).toContainText('Đã thử');

  // Speaking the whole time finishes it.
  await page.getByRole('button', { name: 'Bốc từ mới' }).click();
  await page.getByRole('button', { name: /Bắt đầu nói/ }).click();
  await page.clock.fastForward(31_000);
  await expect(page.getByRole('heading', { name: 'Hết giờ!' })).toBeVisible();
  await expect(page.getByText(`Bạn đã hoàn thành bài tập “${title}”.`)).toBeVisible();
  await page.getByRole('link', { name: 'Về danh sách bài tập' }).click();
  await expect(page.getByRole('region', { name: 'Đã hoàn thành' })).toContainText(title);

  await teacher.reload();
  await expect(studentRow(teacher, name)).toContainText('Đã hoàn thành');
  await expect(studentRow(teacher, name)).toContainText('2 lần');
  await studentRow(teacher, name).getByRole('link', { name: 'Xem buổi gần nhất' }).click();
  await expect(teacher.getByRole('heading', { name: 'Các từ đã luyện' })).toBeVisible();

  await teacher.goto('/#/assignments');
  await expect(teacher.getByRole('listitem').filter({ hasText: title })).toContainText('1/1 đã hoàn thành');
  await teacher.context().close();
});

test("a teacher gives out words from a student's own word bank", async ({ page, browser }) => {
  const title = `Thú cưng của em ${Date.now().toString(36)}`;
  const name = `Phạm Thị Dung ${Date.now().toString(36)}`;
  const student = await signUp(page, { name });
  await seed(page, ANIMALS);

  const teacher = await otherDevice(browser, page);
  const teacherAccount = await signUp(teacher, { name: 'Thầy Hùng' });
  await makeTeacher(teacherAccount.login);
  // None of the student's words.
  await seed(teacher, WORDS.slice(ANIMALS.length));

  await teacher.goto('/#/assignments/new');
  await teacher.locator('#assignment-title').fill(title);
  const bank = teacher.getByLabel('Lấy từ kho từ vựng của');
  await bank.selectOption({ label: `${name} · ${student.login} · ${ANIMALS.length} từ` });
  await expect(teacher.getByText(`Học viên bốc từ trong số ${ANIMALS.length} từ.`)).toBeVisible();
  await teacher.getByRole('group', { name: 'Lấy từ' }).getByRole('button', { name: 'Tự chọn' }).click();
  const choices = teacher.getByRole('list', { name: 'Các từ' });
  await expect(choices.getByRole('checkbox')).toHaveCount(ANIMALS.length);
  await expect(choices).not.toContainText('学校');
  await choices.getByRole('checkbox', { name: /猫/ }).check();
  await expect(teacher.getByText('Học viên bốc từ trong số 1 từ.')).toBeVisible();
  await teacher.getByLabel('Tìm học viên').fill(student.login);
  await teacher.getByRole('checkbox', { name }).check();
  await teacher.getByRole('button', { name: 'Giao bài', exact: true }).click();
  await expect(teacher.getByRole('heading', { name: title })).toBeVisible();
  await expect(teacher.getByText('Kho từ (1)')).toBeVisible();

  // Changing it starts from the student's bank again, with the word given out picked.
  await teacher.getByRole('link', { name: 'Sửa' }).click();
  await expect(bank.locator('option:checked')).toHaveText(`${name} · ${student.login} · ${ANIMALS.length} từ`);
  await expect(choices.getByRole('checkbox', { name: /猫/ })).toBeChecked();
  await expect(choices.getByRole('checkbox', { name: /狗/ })).not.toBeChecked();
  await expect(choices).not.toContainText('学校');

  // The student draws the word that was picked from their own bank.
  await page.goto('/');
  await page.getByRole('link', { name: title }).click();
  await page.getByRole('button', { name: 'Bốc 1 từ' }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị bài nói' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('猫');
  await teacher.context().close();
});

test('a new assignment is kept as a draft until it is given out', async ({ page, browser }) => {
  const title = `Gia đình em ${Date.now().toString(36)}`;
  const name = `Đỗ Minh Khang ${Date.now().toString(36)}`;
  const student = await signUp(page, { name });

  const teacher = await otherDevice(browser, page);
  const teacherAccount = await signUp(teacher, { name: 'Cô Lan' });
  await makeTeacher(teacherAccount.login);
  await seed(teacher, WORDS);

  // The teacher fills everything in, then reloads before giving it out.
  await teacher.goto('/#/assignments/new');
  await teacher.locator('#assignment-title').fill(title);
  await teacher.locator('#assignment-instructions').fill('Dùng ít nhất hai từ.');
  await teacher.getByRole('group', { name: 'Lấy từ' }).getByRole('button', { name: 'Tự chọn' }).click();
  const choices = teacher.getByRole('list', { name: 'Các từ' });
  await choices.getByRole('checkbox', { name: /猫/ }).check();
  await choices.getByRole('checkbox', { name: /狗/ }).check();
  await teacher.getByRole('button', { name: '30 giây' }).click();
  await teacher.locator('#assignment-due').fill(tomorrow());
  await teacher.getByLabel('Tìm học viên').fill(student.login);
  await teacher.getByRole('checkbox', { name }).check();
  await teacher.reload();

  const expectRestored = async () => {
    await expect(teacher.getByText(/Bạn đang soạn tiếp bản nháp lưu/)).toBeVisible();
    await expect(teacher.locator('#assignment-title')).toHaveValue(title);
    await expect(teacher.locator('#assignment-instructions')).toHaveValue('Dùng ít nhất hai từ.');
    await expect(choices.getByRole('checkbox', { name: /猫/ })).toBeChecked();
    await expect(choices.getByRole('checkbox', { name: /狗/ })).toBeChecked();
    await expect(choices.getByRole('checkbox', { name: /学校/ })).not.toBeChecked();
    await expect(teacher.getByText('Học viên bốc từ trong số 2 từ.')).toBeVisible();
    await expect(teacher.getByRole('button', { name: '30 giây' })).toHaveAttribute('aria-pressed', 'true');
    await expect(teacher.locator('#assignment-due')).toHaveValue(tomorrow());
    await expect(teacher.getByRole('checkbox', { name })).toBeChecked();
  };
  await expectRestored();

  // Going to another page keeps it too, and the list of assignments shows it.
  await teacher.getByRole('main').getByRole('link', { name: 'Bài tập', exact: true }).click();
  const draftRow = items(teacher).filter({ hasText: 'Bản nháp' });
  await expect(draftRow).toContainText(title);
  await expect(draftRow).toContainText('Chưa giao');
  await draftRow.getByRole('link', { name: title }).click();
  await expectRestored();

  // Giving it out clears the draft.
  await teacher.getByRole('button', { name: 'Giao bài', exact: true }).click();
  await expect(teacher.getByText('Đã giao bài cho 1 học viên')).toBeVisible();
  await expect(teacher.getByRole('heading', { name: title })).toBeVisible();
  await teacher.goto('/#/assignments');
  await expect(items(teacher).filter({ hasText: title })).toContainText('0/1 đã hoàn thành');
  await expect(items(teacher).filter({ hasText: 'Bản nháp' })).toHaveCount(0);
  await teacher.getByRole('link', { name: 'Giao bài mới' }).click();
  await expect(teacher.locator('#assignment-title')).toHaveValue('');
  await expect(teacher.getByText(/Bạn đang soạn tiếp bản nháp/)).toHaveCount(0);

  // A draft can also be thrown away, to start over.
  await teacher.locator('#assignment-title').fill('Bài sẽ bỏ');
  await teacher.reload();
  await expect(teacher.locator('#assignment-title')).toHaveValue('Bài sẽ bỏ');
  await teacher.getByRole('button', { name: 'Bỏ bản nháp' }).click();
  await teacher.getByRole('dialog').getByRole('button', { name: 'Bỏ bản nháp' }).click();
  await expect(teacher.locator('#assignment-title')).toHaveValue('');
  await expect(teacher.getByText(/Bạn đang soạn tiếp bản nháp/)).toHaveCount(0);
  await teacher.reload();
  await expect(teacher.locator('#assignment-title')).toHaveValue('');
  await expect(teacher.getByText(/Bạn đang soạn tiếp bản nháp/)).toHaveCount(0);
  await teacher.context().close();
});

test('students only see assignments given to them, and cannot give any out', async ({ page }) => {
  await signUp(page);
  await page.goto('/#/assignments');
  await expect(page.getByText('Chưa có bài tập nào')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Giao bài mới' })).toHaveCount(0);
  await page.goto('/#/assignments/new');
  await expect(page.getByRole('heading', { name: 'Trang này không tồn tại' })).toBeVisible();
});
