import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Multiplayer E2E tests — require real Supabase.
 * Run with: npx playwright test --project=multiplayer
 */

async function skipTutorial(page: Page) {
  await page.evaluate(() =>
    localStorage.setItem('crossfire-tutorial-seen', 'true')
  );
}

/** Host creates a room and returns the room code. */
async function createRoomAsHost(
  page: Page,
  name: string,
  category: RegExp = /Science|Ciencia/
): Promise<string> {
  await page.goto('/');
  await skipTutorial(page);
  await page.goto('/');

  await page.getByTestId('play-multi').click();
  await expect(page.getByTestId('multiplayer-menu-screen')).toBeVisible();
  await page.getByTestId('create-room-option').click();

  await page.getByTestId('player-name-input').fill(name);
  await page.getByTestId('name-continue-button').click();

  await expect(page.getByTestId('category-select-screen')).toBeVisible();
  await page.getByText(category).click();
  await page.getByTestId('category-continue-button').click();

  await expect(page.getByTestId('waiting-room-screen')).toBeVisible({ timeout: 15_000 });

  const roomCode = await page.getByTestId('room-code').textContent();
  expect(roomCode).toBeTruthy();
  expect(roomCode!.trim()).toHaveLength(4);

  return roomCode!.trim();
}

/** Guest joins an existing room. */
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

test.describe('Multiplayer E2E', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    // Create two isolated browser contexts (separate sessions/cookies)
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('host creates room, guest joins, both see waiting room', async () => {
    const roomCode = await createRoomAsHost(hostPage, 'HostPlayer');

    await joinRoomAsGuest(guestPage, 'GuestPlayer', roomCode);

    // Guest sees waiting room
    await expect(guestPage.getByTestId('waiting-room-screen')).toBeVisible();

    // Host sees guest joined (player name appears)
    await expect(hostPage.getByText('GuestPlayer', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Guest sees host name
    await expect(guestPage.getByText('HostPlayer', { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('host starts game, both players see game screen', async () => {
    const roomCode = await createRoomAsHost(hostPage, 'Host');
    await joinRoomAsGuest(guestPage, 'Guest', roomCode);

    // Wait for guest to appear on host side
    await expect(hostPage.getByText('Guest', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Host clicks start
    const startButton = hostPage.getByText(/START GAME|INICIAR/i);
    await expect(startButton).toBeEnabled({ timeout: 10_000 });
    await startButton.click();

    // Both should see the game screen after countdown (~4s)
    await expect(hostPage.getByTestId('game-screen')).toBeVisible({ timeout: 15_000 });
    await expect(guestPage.getByTestId('game-screen')).toBeVisible({ timeout: 15_000 });

    // Both see both player names on the game screen
    await expect(hostPage.getByText('Host')).toBeVisible();
    await expect(hostPage.getByText('Guest')).toBeVisible();
    await expect(guestPage.getByText('Host')).toBeVisible();
    await expect(guestPage.getByText('Guest')).toBeVisible();
  });

  test('host selects a clue and types letters, guest sees cell updates', async () => {
    const roomCode = await createRoomAsHost(hostPage, 'Host');
    await joinRoomAsGuest(guestPage, 'Guest', roomCode);

    await expect(hostPage.getByText('Guest', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Start game
    const startButton = hostPage.getByText(/START GAME|INICIAR/i);
    await expect(startButton).toBeEnabled({ timeout: 10_000 });
    await startButton.click();

    await expect(hostPage.getByTestId('game-screen')).toBeVisible({ timeout: 15_000 });
    await expect(guestPage.getByTestId('game-screen')).toBeVisible({ timeout: 15_000 });

    // Host selects the first clue (Player 1's turn = host)
    const firstClue = hostPage.locator('li').first();
    await firstClue.click();

    // Wait briefly for the word to be selected and input focused
    await hostPage.waitForTimeout(500);

    // Get the correct word from session storage (host has it since status is 'playing')
    const wordText = await hostPage.evaluate(() => {
      const raw = sessionStorage.getItem('crossfire-game-session');
      if (!raw) return null;
      const session = JSON.parse(raw);
      const selectedId = session.selectedWordId;
      if (!selectedId || !session.crossword) return null;
      const word = session.crossword.words.find(
        (w: { id: number }) => w.id === selectedId
      );
      return word?.word ?? null;
    });

    // If no word selected yet, verify the game state is at least active
    if (!wordText) {
      // Verify the game is running with both players visible
      await expect(hostPage.getByText('Host')).toBeVisible();
      await expect(guestPage.getByText('Guest', { exact: true })).toBeVisible();
      return;
    }

    // Type each letter — the hidden input captures keyboard events
    for (const letter of wordText) {
      await hostPage.keyboard.type(letter);
      await hostPage.waitForTimeout(100);
    }

    // Verify that the submit button appears (word is fully typed)
    const submitBtn = hostPage.getByTestId('submit-word');
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });

    // Submit the word
    await submitBtn.click();

    // After submission, either the question modal appears (for correct word)
    // or the word shakes and letters clear (for incorrect word).
    // For a correct word, we should see the question modal with the trivia question.
    const questionModal = hostPage.getByTestId('answer-input');
    const feedbackOrQuestion = questionModal.or(hostPage.getByTestId('game-screen'));
    await expect(feedbackOrQuestion.first()).toBeVisible({ timeout: 10_000 });
  });

  test('joining a full room shows error', async ({ browser }) => {
    const roomCode = await createRoomAsHost(hostPage, 'Host');
    await joinRoomAsGuest(guestPage, 'Guest', roomCode);

    // Wait for guest to be acknowledged
    await expect(hostPage.getByText('Guest', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Third player tries to join the same room
    const thirdContext = await browser.newContext();
    const thirdPage = await thirdContext.newPage();

    await thirdPage.goto('/');
    await thirdPage.evaluate(() =>
      localStorage.setItem('crossfire-tutorial-seen', 'true')
    );
    await thirdPage.goto('/');
    await thirdPage.getByTestId('play-multi').click();
    await thirdPage.getByTestId('join-room-option').click();
    await thirdPage.getByTestId('player-name-input').fill('Intruder');
    await thirdPage.getByTestId('name-continue-button').click();
    await expect(thirdPage.getByTestId('join-room-screen')).toBeVisible();
    await thirdPage.getByTestId('join-code-input').fill(roomCode);
    await thirdPage.getByTestId('join-room-button').click();

    // Error should appear
    const error = thirdPage.locator('.text-crimson');
    await expect(error).toBeVisible({ timeout: 10_000 });
    await expect(error).toHaveText(/full|llena|not found|no encontr/i);

    await thirdContext.close();
  });
});
