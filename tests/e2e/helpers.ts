import { type Browser, type BrowserContext, expect, type Page } from '@playwright/test'

/** Shared helpers for tests that need two real players connected over WebRTC. */

// biome-ignore lint/suspicious/noExplicitAny: tests poke at the running game
export type Systems = any

export const contexts: BrowserContext[] = []

/** Close every context a test opened (a leftover game keeps rendering and starves later tests). */
export async function closeContexts(): Promise<void> {
  await Promise.all(contexts.splice(0).map((c) => c.close()))
}

export async function newPlayer(browser: Browser): Promise<Page> {
  // Small viewport: two software-rendered WebGL pages share one CPU.
  const context = await browser.newContext({ viewport: { width: 480, height: 320 } })
  contexts.push(context)
  // Both players are on this machine, so STUN is unnecessary and only slows ICE gathering.
  await context.addInitScript(() => {
    const Native = window.RTCPeerConnection
    const Patched = function (this: unknown, config?: RTCConfiguration) {
      return new Native({ ...config, iceServers: [] })
    } as unknown as typeof RTCPeerConnection
    Patched.prototype = Native.prototype
    window.RTCPeerConnection = Patched
    ;(window as unknown as { sys: () => unknown }).sys = () =>
      (window as unknown as { game: { systems: unknown } }).game.systems
  })
  const page = await context.newPage()
  await page.goto('./', { waitUntil: 'commit' })
  await page.waitForFunction(
    () => !!(window as unknown as { game?: { systems?: { multiplayer?: unknown } } }).game?.systems?.multiplayer,
    undefined,
    { timeout: 90_000 }
  )
  return page
}

// DOM-level click: Playwright's actionability checks stall while the main thread renders.
export const click = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => (el as HTMLElement).click())

/** Do the copy/paste handshake between a host and a guest, leaving both connected. */
export async function connect(host: Page, guest: Page): Promise<void> {
  for (const [page, action] of [
    [host, 'show-host'],
    [guest, 'show-guest'],
  ] as const) {
    await click(page, '#toggleMultiplayer')
    await expect(page.locator('.mp-modal-overlay')).toBeVisible()
    await click(page, `[data-action="${action}"]`)
  }
  await click(host, '[data-action="create-session"]')
  const offer = await host.locator('#host-signal-container .mp-signal-data-content').textContent()
  await guest.locator('#offer-input').fill(offer ?? '')
  await click(guest, '[data-action="join-session"]')
  const answer = await guest.locator('#guest-signal-container .mp-signal-data-content').textContent()
  await host.locator('#answer-input').fill(answer ?? '')
  await click(host, '[data-action="submit-answer"]')
  await expect(host.locator('.mp-status-indicator')).toHaveClass(/connected/)
  await expect(guest.locator('.mp-status-indicator')).toHaveClass(/connected/)
  // Close the dialogs so they do not cover the tool belt.
  for (const page of [host, guest]) await click(page, '.mp-modal-overlay [data-action="close"]')
}
