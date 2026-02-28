import { test, expect } from '@playwright/test';

test.describe('Gameplay Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip tutorial by setting localStorage before navigating
    await page.evaluate(() =>
      localStorage.setItem('crossfire-tutorial-seen', 'true')
    );
    await page.goto('/');
    // Navigate to name input
    await page.getByTestId('play-solo').click();
  });

  test('should navigate from welcome to name input screen', async ({ page }) => {
    await expect(page.getByTestId('name-input-screen')).toBeVisible();
  });

  test('should require name to continue and category to start game', async ({ page }) => {
    await expect(page.getByTestId('name-input-screen')).toBeVisible();

    const nameContinueBtn = page.getByTestId('name-continue-button');
    await expect(nameContinueBtn).toBeDisabled();

    // Enter name
    await page.getByTestId('player-name-input').fill('TestPlayer');
    await expect(nameContinueBtn).toBeEnabled();
    await nameContinueBtn.click();

    // Category screen — continue disabled without category
    await expect(page.getByTestId('category-select-screen')).toBeVisible();
    const categoryContinueBtn = page.getByTestId('category-continue-button');
    await expect(categoryContinueBtn).toBeDisabled();

    // Select a category 
    await page.getByText(/History|Historia/).click();
    await expect(categoryContinueBtn).toBeEnabled();
  });

  test('should start game and show game screen', async ({ page }) => {
    await page.getByTestId('player-name-input').fill('TestPlayer');
    await page.getByTestId('name-continue-button').click();

    await expect(page.getByTestId('category-select-screen')).toBeVisible();
    await page.getByText(/History|Historia/).click();
    await page.getByTestId('category-continue-button').click();

    await expect(page.getByTestId('game-screen')).toBeVisible();
  });
});
