import { expect, test } from '@playwright/test';

test('buy an animal, name it and feed it in the house', async ({ page }) => {
  // A player with coins, food, rooms and six animals (see seed.js).
  await page.addInitScript({ path: 'tests/e2e/seed.js' });
  await page.goto('/');
  await page.locator('.pick', { hasText: 'Sanne' }).click();
  await page.locator('.big-tile', { hasText: 'Winkel' }).click();

  // Water animals need the pond (the seed has one); locked animals show their goal.
  await expect(page.locator('#animal-unicorn')).toContainText('Haal een 9 of hoger op een toets');
  await page.locator('#animal-mouse .price').click();
  await page.getByRole('button', { name: 'Kopen!' }).click();
  await expect(page.getByText('Welkom, Muis!')).toBeVisible();
  await page.getByLabel('Geef je muis een naam').fill('Piep');
  await page.getByRole('button', { name: /Mijn huis/ }).click();

  await expect(page.locator('#coin-counter')).toContainText('1.210');
  const piep = page.locator('.pet', { hasText: 'Piep' });
  await expect(piep).toBeVisible();
  await expect(page.getByText('6/6')).toBeVisible();

  // Drag a portion of food from the bowl onto Piep.
  const from = await page.locator('.food').boundingBox();
  const to = await piep.locator('.pet-token').boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 10, { steps: 8 });
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByText('1 voer')).toBeVisible();
  await expect(piep.locator('.heart')).toBeVisible();

  // Tap an animal for its card; it is already fed today.
  await piep.locator('.pet-token').click();
  await expect(page.getByText('Al gevoerd vandaag')).toBeVisible();
});
