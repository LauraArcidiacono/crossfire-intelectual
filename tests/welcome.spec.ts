import { test, expect } from '@playwright/test';

test.describe('Welcome Screen', () => {
  test('should render the welcome screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
  });

  test('should display the game title', async ({ page }) => {
    await page.goto('/');
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
  });

  test('should show solo and multiplayer options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('play-solo')).toBeVisible();
    await expect(page.getByTestId('play-multi')).toBeVisible();
  });

  test('should show how to play button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('how-to-play')).toBeVisible();
  });
});
