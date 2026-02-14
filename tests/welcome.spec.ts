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
});
