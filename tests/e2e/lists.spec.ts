import { expect, test } from '@playwright/test';
import { newPlayer } from './helpers';

test('paste a list, save it, and open its share link on another device', async ({ page, browser }) => {
  await page.goto('/');
  await newPlayer(page);
  await page.getByText('Nieuwe lijst plakken').click();
  await page.getByPlaceholder('bijv. Unit 3').fill('Unit 3 – At home');
  await page.locator('textarea').fill('English\tNederlands\nhouse\thuis\nkitchen\tde keuken\nbig / large\tgroot\n(to) cook\tkoken');
  await expect(page.getByText('4 woorden herkend')).toBeVisible();
  await page.getByRole('button', { name: 'Zet in de lijst' }).click();
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unit 3 – At home' })).toBeVisible();

  const card = page.locator('article', { hasText: 'Unit 3 – At home' });
  await card.getByRole('button', { name: 'Delen' }).click();
  const link = await page.locator('#share-link').inputValue();
  expect(link).toContain('#list=');

  const other = await browser.newPage();
  await other.goto(link);
  await expect(other.getByText('Lijst toevoegen?')).toBeVisible();
  await expect(other.getByText('"Unit 3 – At home" met 4 woorden')).toBeVisible();
  await other.getByRole('button', { name: 'Toevoegen' }).click();
  await newPlayer(other, 'Daan');
  await expect(other.getByRole('heading', { name: 'Unit 3 – At home' })).toBeVisible();
});
