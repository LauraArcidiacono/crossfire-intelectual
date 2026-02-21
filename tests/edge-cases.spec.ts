import { test, expect } from '@playwright/test';

/** Skip tutorial and go to welcome screen. */
async function goToWelcome(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('crossfire-tutorial-seen', 'true')
  );
  await page.goto('/');
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
}

test.describe('Edge Cases', () => {
  test('joining a non-existent room shows error', async ({ page }) => {
    await goToWelcome(page);
    await page.getByTestId('play-multi').click();
    await expect(page.getByTestId('config-screen')).toBeVisible();

    await page.getByTestId('player-name-input').fill('LostPlayer');
    await page.getByTestId('join-code-input').fill('ZZZZ');
    await page.getByTestId('join-room-button').click();

    // Error message should appear (styled with text-crimson)
    const error = page.locator('.text-crimson');
    await expect(error).toBeVisible({ timeout: 10_000 });
    // Should contain "not found" or equivalent error text
    await expect(error).toHaveText(/not found|full|no encontr|llena/i);
  });

  test('game works with a single category', async ({ page }) => {
    await goToWelcome(page);
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('config-screen')).toBeVisible();

    await page.getByTestId('player-name-input').fill('SingleCat');

    // Select only one category
    await page.getByText(/Geography|Geografía/).click();

    const continueBtn = page.getByTestId('continue-button');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Game should start with just that one category
    await expect(page.getByTestId('game-screen')).toBeVisible();
    await expect(page.getByText('SingleCat')).toBeVisible();
  });

  test('exit game returns to welcome screen', async ({ page }) => {
    await goToWelcome(page);
    await page.getByTestId('play-solo').click();
    await page.getByTestId('player-name-input').fill('Quitter');
    await page.getByText(/History|Historia/).click();
    await page.getByTestId('continue-button').click();

    await expect(page.getByTestId('game-screen')).toBeVisible();

    // Click exit button
    await page.getByText(/Exit|Salir/).first().click();

    // Confirm exit dialog
    const yesButton = page.getByRole('button').filter({ hasText: /Yes|Sí/ });
    await expect(yesButton).toBeVisible();
    await yesButton.click();

    // Should return to welcome screen
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
  });
});
