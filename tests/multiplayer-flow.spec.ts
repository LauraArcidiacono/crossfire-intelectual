import { test, expect } from '@playwright/test';

test.describe('Multiplayer Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tutorial
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('crossfire-tutorial-seen', 'true')
    );
    await page.goto('/');
  });

  test('should navigate to multiplayer config screen', async ({ page }) => {
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    await page.getByTestId('play-multi').click();
    await expect(page.getByTestId('config-screen')).toBeVisible();
  });

  test('should show create room and join room options in multiplayer', async ({ page }) => {
    await page.getByTestId('play-multi').click();
    await expect(page.getByTestId('config-screen')).toBeVisible();

    // Create room button should be visible
    await expect(page.getByTestId('create-room-button')).toBeVisible();

    // Join room section should be visible
    await expect(page.getByTestId('join-code-input')).toBeVisible();
    await expect(page.getByTestId('join-room-button')).toBeVisible();
  });

  test('create room button should be disabled without name and categories', async ({ page }) => {
    await page.getByTestId('play-multi').click();

    // Button disabled initially (no name, no categories)
    await expect(page.getByTestId('create-room-button')).toBeDisabled();

    // Add name only — still disabled (no categories)
    await page.getByTestId('player-name-input').fill('HostPlayer');
    await expect(page.getByTestId('create-room-button')).toBeDisabled();

    // Add category — now enabled
    await page.getByText(/Science|Ciencia/).click();
    await expect(page.getByTestId('create-room-button')).toBeEnabled();
  });

  test('join room button should be disabled without name and code', async ({ page }) => {
    await page.getByTestId('play-multi').click();

    // Join button disabled initially
    await expect(page.getByTestId('join-room-button')).toBeDisabled();

    // Add name only
    await page.getByTestId('player-name-input').fill('GuestPlayer');
    await expect(page.getByTestId('join-room-button')).toBeDisabled();

    // Add code — now enabled
    await page.getByTestId('join-code-input').fill('AB12');
    await expect(page.getByTestId('join-room-button')).toBeEnabled();
  });

  test('join code input should auto-capitalize and limit to 4 chars', async ({ page }) => {
    await page.getByTestId('play-multi').click();

    const codeInput = page.getByTestId('join-code-input');
    await codeInput.fill('abcdef');

    // Should be limited to 4 chars and uppercased
    await expect(codeInput).toHaveValue('ABCD');
  });

  test('solo mode should not show room options', async ({ page }) => {
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('config-screen')).toBeVisible();

    // Should show continue button, not create/join room
    await expect(page.getByTestId('continue-button')).toBeVisible();
    await expect(page.getByTestId('create-room-button')).not.toBeVisible();
    await expect(page.getByTestId('join-room-button')).not.toBeVisible();
  });
});
