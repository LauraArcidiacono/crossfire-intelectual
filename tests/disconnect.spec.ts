import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Disconnect / reconnect tests — require real Supabase.
 * Run with: npx playwright test --project=multiplayer
 *
 * These tests are slow because Supabase presence heartbeat takes 10-30s
 * to detect that a user has left.
 *
 * We use page.close() to truly disconnect (kills WebSocket),
 * since context.setOffline() doesn't reliably break existing WebSocket connections.
 */

async function skipTutorial(page: Page) {
  await page.evaluate(() =>
    localStorage.setItem('crossfire-tutorial-seen', 'true')
  );
}

async function createRoomAsHost(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await skipTutorial(page);
  await page.goto('/');

  await page.getByTestId('play-multi').click();
  await expect(page.getByTestId('multiplayer-menu-screen')).toBeVisible();
  await page.getByTestId('create-room-option').click();

  await page.getByTestId('player-name-input').fill(name);
  await page.getByTestId('name-continue-button').click();

  await expect(page.getByTestId('category-select-screen')).toBeVisible();
  await page.getByText(/Science|Ciencia/).click();
  await page.getByTestId('category-continue-button').click();

  await expect(page.getByTestId('waiting-room-screen')).toBeVisible({ timeout: 15_000 });
  const code = await page.getByTestId('room-code').textContent();
  return code!.trim();
}

async function joinRoomAsGuest(page: Page, name: string, roomCode: string) {
  await page.goto('/');
  await skipTutorial(page);
  await page.goto('/');

  await page.getByTestId('play-multi').click();
  await expect(page.getByTestId('multiplayer-menu-screen')).toBeVisible();
  await page.getByTestId('join-room-option').click();

  await page.getByTestId('player-name-input').fill(name);
  await page.getByTestId('name-continue-button').click();

  await expect(page.getByTestId('join-room-screen')).toBeVisible();
  await page.getByTestId('join-code-input').fill(roomCode);
  await page.getByTestId('join-room-button').click();

  await expect(page.getByTestId('waiting-room-screen')).toBeVisible({ timeout: 15_000 });
}

/** Start the game from the host side after guest has joined. */
async function startGame(hostPage: Page, guestPage: Page) {
  const startButton = hostPage.getByText(/START GAME|INICIAR/i);
  await expect(startButton).toBeEnabled({ timeout: 15_000 });
  await startButton.click();

  await expect(hostPage.getByTestId('game-screen')).toBeVisible({ timeout: 15_000 });
  await expect(guestPage.getByTestId('game-screen')).toBeVisible({ timeout: 15_000 });

  // Wait a moment for presence to be fully established on both sides
  await hostPage.waitForTimeout(3_000);
}

test.describe('Disconnect Scenarios', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  // Supabase Realtime presence heartbeat timing is controlled server-side and
  // can take >90s to detect disconnects in automated tests. These tests verify
  // the disconnect detection flow but are skipped in CI — test manually by
  // closing a browser tab during a multiplayer game.
  test.fixme('guest disconnect shows modal on host side', async () => {
    test.slow();

    const roomCode = await createRoomAsHost(hostPage, 'Host');
    await joinRoomAsGuest(guestPage, 'Guest', roomCode);
    await expect(hostPage.getByText('Guest', { exact: true })).toBeVisible({ timeout: 15_000 });
    await startGame(hostPage, guestPage);

    await guestPage.close();

    const disconnectText = hostPage.getByText(/opponent disconnected|oponente desconectado|^disconnected$|^desconectado$/i);
    await expect(disconnectText.first()).toBeVisible({ timeout: 90_000 });
  });

  test.fixme('host disconnect: guest sees disconnected indicator', async () => {
    test.slow();

    const roomCode = await createRoomAsHost(hostPage, 'Host');
    await joinRoomAsGuest(guestPage, 'Guest', roomCode);
    await expect(hostPage.getByText('Guest', { exact: true })).toBeVisible({ timeout: 15_000 });
    await startGame(hostPage, guestPage);

    await hostPage.close();

    const disconnectText = guestPage.getByText(/opponent disconnected|oponente desconectado|^disconnected$|^desconectado$/i);
    await expect(disconnectText.first()).toBeVisible({ timeout: 90_000 });
  });

  test('game continues after brief disconnect', async () => {
    test.slow();

    const roomCode = await createRoomAsHost(hostPage, 'Host');
    await joinRoomAsGuest(guestPage, 'Guest', roomCode);
    await expect(hostPage.getByText('Guest', { exact: true })).toBeVisible({ timeout: 15_000 });
    await startGame(hostPage, guestPage);

    // Guest briefly goes offline (context-level to preserve page)
    await guestContext.setOffline(true);
    await guestPage.waitForTimeout(3_000);
    await guestContext.setOffline(false);

    // Wait for reconnection to stabilize
    await guestPage.waitForTimeout(5_000);

    // Game screen should still be visible on both sides
    await expect(hostPage.getByTestId('game-screen')).toBeVisible();
    await expect(guestPage.getByTestId('game-screen')).toBeVisible();

    // Both players' names still visible
    await expect(hostPage.getByText('Host')).toBeVisible();
    await expect(guestPage.getByText('Guest', { exact: true })).toBeVisible();
  });
});
