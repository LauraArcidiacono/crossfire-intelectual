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

  test('should navigate to multiplayer menu screen', async ({ page }) => {
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    await page.getByTestId('play-multi').click();
    await expect(page.getByTestId('multiplayer-menu-screen')).toBeVisible();
  });

  test('should show create room and join room options in multiplayer', async ({ page }) => {
    await page.getByTestId('play-multi').click();
    await expect(page.getByTestId('multiplayer-menu-screen')).toBeVisible();

    // Both options should be visible
    await expect(page.getByTestId('create-room-option')).toBeVisible();
    await expect(page.getByTestId('join-room-option')).toBeVisible();
  });

  test('create room flow: name required then category required', async ({ page }) => {
    await page.getByTestId('play-multi').click();
    await page.getByTestId('create-room-option').click();

    // Name screen: continue disabled without name
    await expect(page.getByTestId('name-input-screen')).toBeVisible();
    await expect(page.getByTestId('name-continue-button')).toBeDisabled();

    // Add name — now enabled
    await page.getByTestId('player-name-input').fill('HostPlayer');
    await expect(page.getByTestId('name-continue-button')).toBeEnabled();
    await page.getByTestId('name-continue-button').click();

    // Category screen: continue disabled without category
    await expect(page.getByTestId('category-select-screen')).toBeVisible();
    await expect(page.getByTestId('category-continue-button')).toBeDisabled();

    // Add category — now enabled
    await page.getByText(/Science|Ciencia/).click();
    await expect(page.getByTestId('category-continue-button')).toBeEnabled();
  });

  test('join room button should be disabled without code', async ({ page }) => {
    await page.getByTestId('play-multi').click();
    await page.getByTestId('join-room-option').click();

    // Fill name and continue to join-room screen
    await page.getByTestId('player-name-input').fill('GuestPlayer');
    await page.getByTestId('name-continue-button').click();

    // Join room screen: button disabled initially (no code)
    await expect(page.getByTestId('join-room-screen')).toBeVisible();
    await expect(page.getByTestId('join-room-button')).toBeDisabled();

    // Add code — now enabled
    await page.getByTestId('join-code-input').fill('AB12');
    await expect(page.getByTestId('join-room-button')).toBeEnabled();
  });

  test('join code input should auto-capitalize and limit to 4 chars', async ({ page }) => {
    await page.getByTestId('play-multi').click();
    await page.getByTestId('join-room-option').click();

    // Fill name to reach join-room screen
    await page.getByTestId('player-name-input').fill('GuestPlayer');
    await page.getByTestId('name-continue-button').click();

    await expect(page.getByTestId('join-room-screen')).toBeVisible();
    const codeInput = page.getByTestId('join-code-input');
    await codeInput.fill('abcdef');

    // Should be limited to 4 chars and uppercased
    await expect(codeInput).toHaveValue('ABCD');
  });

  test('solo mode flows through name and category screens without room options', async ({ page }) => {
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('name-input-screen')).toBeVisible();

    // No multiplayer menu options on name screen
    await expect(page.getByTestId('create-room-option')).not.toBeVisible();
    await expect(page.getByTestId('join-room-option')).not.toBeVisible();

    // Continue to category screen
    await page.getByTestId('player-name-input').fill('SoloPlayer');
    await page.getByTestId('name-continue-button').click();
    await expect(page.getByTestId('category-select-screen')).toBeVisible();

    // No join-room elements on category screen
    await expect(page.getByTestId('join-code-input')).not.toBeVisible();
    await expect(page.getByTestId('join-room-button')).not.toBeVisible();
  });
});
