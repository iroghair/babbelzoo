import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

/** Answers the current question: right (`good`) or with a wrong word. */
async function answer(page: Page, good: boolean): Promise<void> {
  if (await page.getByRole('button', { name: 'Ik snap het' }).isVisible()) {
    await page.getByRole('button', { name: 'Ik snap het' }).click();
  }
  const q = await page.evaluate(() => {
    const s = (window as unknown as { __session: { question: { answer: string; mode: string; options: string[] } } }).__session;
    return { answer: s.question.answer, mode: s.question.mode, options: s.question.options };
  });
  if (q.mode === 'type') {
    await page.locator('input.answer').fill(good ? q.answer : 'zzzz');
    await page.locator('input.answer').press('Enter');
  } else {
    const option = good ? q.answer : q.options.find((o) => o !== q.answer)!;
    await page.locator('.tiles .tile', { hasText: new RegExp(`^\\d${option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
  }
  if (!good && (await page.getByText('Typ het goede antwoord over').isVisible())) {
    await page.locator('input.copy').fill(q.answer);
  }
  await page.getByRole('button', { name: 'Verder' }).click();
}

test('a full learning round earns coins and food', async ({ page }) => {
  await page.goto('/');
  await newPlayer(page);
  await page.locator('.big-tile', { hasText: 'Oefenen' }).click();
  await page.getByRole('button', { name: 'Start!' }).first().click();
  for (let i = 0; i < 10; i++) await answer(page, i !== 3);
  await expect(page.getByRole('heading', { name: 'Sessie klaar!' }).first()).toBeVisible();
  await expect(page.locator('.reward.wood b')).toHaveText('+1');
  await expect(page.getByText('Dagbonus: +20')).toBeVisible();
  await expect(page.getByText('Deze woorden nog even oefenen')).toBeVisible();
  await page.getByText('Naar home').click();
  await expect(page.getByText('1 voer')).toBeVisible();
  await expect(page.locator('#coin-counter')).not.toHaveText('0');
});

test('a test gives a grade and lets you practise the mistakes', async ({ page }) => {
  await page.goto('/');
  await newPlayer(page);
  await page.locator('.big-tile', { hasText: 'Toets' }).click();
  await page.getByRole('button', { name: 'Start de toets' }).first().click();
  for (let i = 0; i < 30; i++) await answer(page, i >= 3);
  await expect(page.locator('.grade')).toHaveText('9,1');
  await expect(page.getByText('27 van 30 goed', { exact: false })).toBeVisible();
  await expect(page.locator('.mistake')).toHaveCount(3);
  await page.getByRole('button', { name: /Oefen deze woorden/ }).click();
  await expect(page.locator('.qcard')).toBeVisible();
  const ids = await page.evaluate(() => (window as unknown as { __session: { total: number } }).__session.total);
  expect(ids).toBe(10);
});
