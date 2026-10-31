import type { Page } from '@playwright/test';

/** A fresh browser starts at "Who is playing?" with the new-player form open. */
export async function newPlayer(page: Page, name = 'Sanne'): Promise<void> {
  await page.getByLabel('Naam').fill(name);
  await page.getByRole('button', { name: 'Spelen!' }).click();
}
