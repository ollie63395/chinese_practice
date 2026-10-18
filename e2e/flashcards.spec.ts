import { expect, test } from '@playwright/test';
import { nav, seed, WORDS } from './helpers';

test('revises a tag, reviews the missed card, then gets a perfect round', async ({ page }) => {
  await seed(page, WORDS);
  await nav(page).getByRole('link', { name: 'Thẻ ghi nhớ' }).click();
  await page.getByText('Theo nhãn').click();
  await page.getByRole('button', { name: /^động vật/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu · 2 thẻ' }).click();

  const card = page.getByRole('button', { name: 'Lật thẻ xem đáp án' });
  await expect(card).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Xem lại mặt trước' })).toBeVisible();

  await page.keyboard.press('ArrowRight'); // đã thuộc
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Chưa thuộc' }).click();

  await expect(page.getByRole('heading', { name: 'Xong một lượt!' })).toBeVisible();
  await expect(page.getByText('Bạn đã thuộc 1 trên 2 thẻ.')).toBeVisible();

  await page.getByRole('button', { name: 'Ôn lại 1 thẻ chưa thuộc' }).click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await page.getByRole('button', { name: 'Đã thuộc' }).click();
  await expect(page.getByRole('heading', { name: 'Thuộc hết rồi!' })).toBeVisible();
});

test('undo goes back a card', async ({ page }) => {
  await seed(page, WORDS);
  await page.goto('/#/flashcards/review');
  await expect(page.getByText(`1 / ${WORDS.length}`)).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText(`2 / ${WORDS.length}`)).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByText(`1 / ${WORDS.length}`)).toBeVisible();
});

test('can show the meaning first', async ({ page }) => {
  await seed(page, WORDS);
  await page.goto('/#/flashcards/review?front=meaning&shuffle=0');
  // Both faces are in the page; the one facing the user isn't aria-hidden.
  const shownFace = page.locator('.flip-face[aria-hidden="false"]');
  // Unshuffled, the oldest word comes first.
  await expect(shownFace).toContainText('mèo');
  await expect(shownFace).not.toContainText('猫');
  await page.getByRole('button', { name: 'Lật thẻ xem đáp án' }).click();
  await expect(shownFace).toContainText('猫');
  await expect(shownFace).toContainText('māo');
});
