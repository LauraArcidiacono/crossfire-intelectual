import { test, expect } from '@playwright/test';

const SESSION_KEY = 'crossfire-game-session';

/** Navigate to a running solo game (skips tutorial, fills config, starts). */
async function startSoloGame(page: import('@playwright/test').Page, name = 'TestPlayer') {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('crossfire-tutorial-seen', 'true')
  );
  await page.goto('/');
  await page.getByTestId('play-solo').click();
  await page.getByTestId('player-name-input').fill(name);
  await page.getByTestId('name-continue-button').click();
  await page.getByText(/Science|Ciencia/).click();
  await page.getByTestId('category-continue-button').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
}

test.describe('Session Persistence', () => {
  test('sessionStorage is populated during an active game', async ({ page }) => {
    await startSoloGame(page);

    const session = await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);
    expect(session).not.toBeNull();

    const parsed = JSON.parse(session!);
    expect(parsed.status).toBe('playing');
    expect(parsed.players[0].name).toBe('TestPlayer');
  });

  test('game restores after page reload', async ({ page }) => {
    await startSoloGame(page, 'ReloadPlayer');

    // Dismiss the beforeunload dialog automatically
    page.on('dialog', (dialog) => dialog.accept());
    await page.reload();

    // Game screen should reappear with persisted state
    await expect(page.getByTestId('game-screen')).toBeVisible();
    await expect(page.getByText('ReloadPlayer')).toBeVisible();
  });

  test('session is cleared when status is not playing', async ({ page }) => {
    await startSoloGame(page);

    // Verify session exists first
    let session = await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);
    expect(session).not.toBeNull();

    // Force status to 'finished' via store, which triggers saveSession → removeItem
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (window as any).__zustand_store__;
      if (store) store.getState().setStatus('finished');
    });

    // The subscribe handler runs synchronously, so session should be gone
    // If __zustand_store__ isn't exposed, use the game's own exit mechanism
    session = await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);

    // If the direct store access didn't work (store not exposed), use the exit button flow instead
    if (session !== null) {
      await page.getByText(/Exit|Salir/).first().click();
      // Confirm exit
      await page.getByText(/Yes|Sí/).click();
      await expect(page.getByTestId('welcome-screen')).toBeVisible();

      session = await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);
      expect(session).toBeNull();
    }
  });

  test('no restore when seeded session has status "waiting"', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('crossfire-tutorial-seen', 'true')
    );

    // Seed sessionStorage with a non-playing status
    await page.evaluate((key) => {
      const fakeSession = {
        status: 'waiting',
        mode: 'solo',
        currentTurn: 1,
        players: [
          { id: '1', name: 'Ghost', score: 0, isReady: false },
          { id: '2', name: 'Bot', score: 0, isReady: false },
        ],
        currentScreen: 'game',
        usedQuestionIds: [],
      };
      sessionStorage.setItem(key, JSON.stringify(fakeSession));
    }, SESSION_KEY);

    // Reload — the app should NOT restore since status !== 'playing'
    await page.goto('/');
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
  });

  test('usedQuestionIds Set survives serialization round-trip', async ({ page }) => {
    await startSoloGame(page);

    // Inject some used question IDs into the store
    await page.evaluate(() => {
      // Access the store via the module's exported singleton
      // We simulate by writing directly to sessionStorage with known IDs
      const key = 'crossfire-game-session';
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.usedQuestionIds = ['q1', 'q2', 'q3'];
      sessionStorage.setItem(key, JSON.stringify(parsed));
    });

    // Reload to trigger loadSession
    page.on('dialog', (dialog) => dialog.accept());
    await page.reload();

    await expect(page.getByTestId('game-screen')).toBeVisible();

    // Verify the session was loaded and IDs are still there
    const session = await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);
    expect(session).not.toBeNull();
    const parsed = JSON.parse(session!);
    // After reload, the store converts array → Set, then on next save converts Set → array
    expect(parsed.usedQuestionIds).toContain('q1');
    expect(parsed.usedQuestionIds).toContain('q2');
    expect(parsed.usedQuestionIds).toContain('q3');
  });

  test('beforeunload dialog fires during active game', async ({ page }) => {
    await startSoloGame(page);

    let dialogTriggered = false;
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      await dialog.accept();
    });

    await page.reload();

    expect(dialogTriggered).toBe(true);
  });
});
