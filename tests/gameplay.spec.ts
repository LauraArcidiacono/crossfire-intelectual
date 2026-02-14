import { test, expect } from '@playwright/test';

test.describe('Gameplay Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to config: click solo
    await page.getByTestId('play-solo').click();
    // Tutorial might show - handle it
    const tutorialScreen = page.getByTestId('tutorial-screen');
    if (await tutorialScreen.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.getByText(/GOT IT|ENTENDIDO/).click();
    }
  });

  test('should navigate from welcome to config screen', async ({ page }) => {
    await expect(page.getByTestId('config-screen')).toBeVisible();
  });

  test('should require name and category to continue', async ({ page }) => {
    const continueBtn = page.getByTestId('continue-button');
    await expect(continueBtn).toBeDisabled();

    // Enter name
    await page.getByTestId('player-name-input').fill('TestPlayer');

    // Still disabled without category
    await expect(continueBtn).toBeDisabled();

    // Select a category
    await page.getByText(/History|Historia/).click();

    // Now enabled
    await expect(continueBtn).toBeEnabled();
  });

  test('should start game and show game screen', async ({ page }) => {
    await page.getByTestId('player-name-input').fill('TestPlayer');
    await page.getByText(/History|Historia/).click();
    await page.getByTestId('continue-button').click();

    await expect(page.getByTestId('game-screen')).toBeVisible();
  });
});
