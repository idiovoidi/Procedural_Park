import { type Browser, type BrowserContext, expect, type Page, test } from '@playwright/test'

/**
 * End-to-end multiplayer test.
 *
 * Multiplayer here is serverless peer-to-peer WebRTC with manual copy/paste signaling,
 * so the only "server" is the Vite dev server serving the game. This test opens two
 * independent browser contexts (two players), performs the real offer/answer handshake
 * through the UI, then checks that data actually flows over the data channel.
 */

// Shape of the bits of `window.game` the test pokes at (runtime-only, not type-checked against src).
type TestWindow = {
  game?: {
    systems?: {
      multiplayer?: { sendPhotoEvent(): void; isConnected(): boolean }
      state?: { getMultiplayerState(): { peerPosition: unknown; isConnected: boolean } }
    }
  }
}

// Contexts made with `browser.newContext()` are not closed automatically. A leftover game
// keeps rendering and starves later tests on a CPU-only runner, so close them after each test.
const contexts: BrowserContext[] = []
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((c) => c.close()))
})

async function newPlayer(browser: Browser): Promise<Page> {
  // Small viewport: two software-rendered WebGL pages share one CPU.
  const context = await browser.newContext({ viewport: { width: 480, height: 320 } })
  contexts.push(context)
  // Hermetic test: both players are on this machine, so STUN servers are unnecessary. With
  // trickle ICE disabled the app waits for ICE gathering before emitting each offer/answer, and
  // unreachable STUN servers make that wait many seconds - longer than the app's 30s host timeout
  // once the rest of the handshake is added. Dropping them also removes any dependency on Google.
  await context.addInitScript(() => {
    const Native = window.RTCPeerConnection
    const Patched = function (this: unknown, config?: RTCConfiguration) {
      return new Native({ ...config, iceServers: [] })
    } as unknown as typeof RTCPeerConnection
    Patched.prototype = Native.prototype
    window.RTCPeerConnection = Patched

    // The app's host-side connection timeout (30s, see DEFAULT_CONFIG.connectionTimeout) is
    // sized for a human copy/pasting codes, and it starts when the offer is generated. On a slow
    // CI runner the scripted handshake can occasionally exceed it, so stretch that one timer.
    const nativeSetTimeout = window.setTimeout.bind(window)
    window.setTimeout = ((handler: TimerHandler, ms?: number, ...args: unknown[]) =>
      nativeSetTimeout(handler, ms === 30_000 ? 300_000 : ms, ...args)) as typeof window.setTimeout
  })
  const page = await context.newPage()
  // Surface app errors (e.g. WebRTC failures) in the test log; they explain most handshake failures.
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[browser] ${msg.text().split('\n')[0]}`)
  })
  await page.goto('./', { waitUntil: 'commit' })
  // The HUD button exists in the static HTML before the game has wired up its handlers,
  // so wait for the game instance itself.
  await page.waitForFunction(() => !!(window as TestWindow).game?.systems?.multiplayer, undefined, {
    timeout: 90_000,
  })
  return page
}

// DOM-level click: Playwright's actionability checks stall while the page's main thread
// is busy rendering, and none of these elements are covered or animated.
const click = (page: Page, selector: string) => page.locator(selector).evaluate((el) => (el as HTMLElement).click())

async function openMultiplayerModal(page: Page) {
  await click(page, '#toggleMultiplayer')
  await expect(page.locator('.mp-modal-overlay')).toBeVisible()
}

test.describe('multiplayer', () => {
  test('rejects a malformed offer code', async ({ browser }) => {
    const guest = await newPlayer(browser)
    await openMultiplayerModal(guest)
    await click(guest, '[data-action="show-guest"]')
    await guest.locator('#offer-input').fill('this is not json')
    await click(guest, '[data-action="join-session"]')
    await expect(guest.locator('.mp-notification')).toContainText('Invalid offer code format')
    await expect(guest.locator('.mp-status-indicator')).toHaveClass(/disconnected/)
  })

  test('two players connect, sync state, share events and disconnect', async ({ browser }) => {
    const host = await newPlayer(browser)
    const guest = await newPlayer(browser)

    // Open both dialogs up front: the host's connection timeout (30s) starts when the offer is
    // generated, so keep the window between "Generate Offer" and "Connect" as short as possible.
    await openMultiplayerModal(host)
    await click(host, '[data-action="show-host"]')
    await openMultiplayerModal(guest)
    await click(guest, '[data-action="show-guest"]')

    await test.step('handshake via copy/paste signaling', async () => {
      await click(host, '[data-action="create-session"]')
      const offer = await host.locator('#host-signal-container .mp-signal-data-content').textContent()
      expect(JSON.parse(offer ?? '').type).toBe('offer')

      await guest.locator('#offer-input').fill(offer ?? '')
      await click(guest, '[data-action="join-session"]')
      const answer = await guest
        .locator('#guest-signal-container .mp-signal-data-content')
        .textContent()
      expect(JSON.parse(answer ?? '').type).toBe('answer')

      await host.locator('#answer-input').fill(answer ?? '')
      await click(host, '[data-action="submit-answer"]')

      await expect(host.locator('.mp-status-indicator')).toHaveClass(/connected/)
      await expect(guest.locator('.mp-status-indicator')).toHaveClass(/connected/)
      await expect(host.locator('.mp-status-text')).toContainText('Connected')
    })

    await test.step("each player receives the other's position", async () => {
      for (const page of [host, guest]) {
        await page.waitForFunction(
          () => {
            const mp = (window as TestWindow).game?.systems?.state?.getMultiplayerState()
            return !!mp?.isConnected && mp.peerPosition !== null
          },
          undefined,
          { timeout: 20_000 }
        )
      }
    })

    await test.step('game events cross the data channel', async () => {
      await guest.evaluate(() => (window as TestWindow).game?.systems?.multiplayer?.sendPhotoEvent())
      await expect(host.locator('.mp-notification').first()).toContainText('took a photo')
    })

    await test.step('disconnect is seen by both sides', async () => {
      await click(host, '[data-action="disconnect"]')
      await expect(host.locator('.mp-status-indicator')).toHaveClass(/disconnected/)
      await expect(guest.locator('.mp-status-indicator')).toHaveClass(/disconnected/, {
        timeout: 30_000,
      })
    })
  })
})
