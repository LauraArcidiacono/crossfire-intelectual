import { test, expect } from '@playwright/test';

test.describe('Solo Mode E2E', () => {
  test('full solo flow: welcome -> config -> game', async ({ page }) => {
    await page.goto('/');

    // Skip tutorial
    await page.evaluate(() =>
      localStorage.setItem('crossfire-tutorial-seen', 'true')
    );
    await page.goto('/');

    // Welcome screen
    await expect(page.getByTestId('welcome-screen')).toBeVisible();

    // Click solo
    await page.getByTestId('play-solo').click();

    // Config screen
    await expect(page.getByTestId('config-screen')).toBeVisible();

    // Fill name
    await page.getByTestId('player-name-input').fill('Player1');

    // Select categories
    await page.getByText(/Science|Ciencia/).click();
    await page.getByText(/History|Historia/).click();

    // Continue to game
    await page.getByTestId('continue-button').click();

    // Game screen should be visible
    await expect(page.getByTestId('game-screen')).toBeVisible();

    // Verify player name and Socrates are shown
    await expect(page.getByText('Player1')).toBeVisible();
    await expect(page.getByText('Socrates')).toBeVisible();
  });

  test('language toggle works on welcome screen', async ({ page }) => {
    await page.goto('/');

    // Default language shows title
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();

    // Toggle language by clicking the language selector button
    const langButton = page.locator('button', { has: page.locator('text=ES') }).filter({ has: page.locator('text=EN') });
    await langButton.click();

    // Title should still be visible after toggle
    await expect(title).toBeVisible();
  });
});
