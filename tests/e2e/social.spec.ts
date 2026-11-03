import { expect, test } from '@playwright/test'
import { click, closeContexts, connect, newPlayer, type Systems } from './helpers'

/**
 * M4 in the real game, with two real browsers connected over WebRTC: card trading, shared
 * codex and visiting a friend's park.
 */

declare const sys: () => Systems

test.afterEach(closeContexts)

test('trade a creature with a friend', async ({ browser }) => {
  test.setTimeout(300_000)
  const host = await newPlayer(browser)
  const guest = await newPlayer(browser)
  await connect(host, guest)

  const name = await host.evaluate(() => {
    const s = sys()
    const genome = s.creatures.getAllCreatures()[0].genome
    return s.roster.add(genome, { name: 'Pebble' }).name
  })
  expect(name).toBe('Pebble')

  // The host offers Pebble from the Trade panel.
  await click(host, '#tool-belt [data-tool=trade]')
  await expect(host.locator('#trade-panel')).toBeVisible()
  await host.locator('#trade-panel .tp-row', { hasText: 'Pebble' }).locator('button:has-text("Offer")').evaluate((b) => (b as HTMLElement).click())

  // The guest sees it and accepts.
  await expect(guest.locator('#toast')).toContainText('Pebble', { timeout: 30_000 })
  await click(guest, '#tool-belt [data-tool=trade]')
  await guest.locator('#trade-panel .tp-row', { hasText: 'Pebble' }).locator('button:has-text("Accept")').evaluate((b) => (b as HTMLElement).click())

  await expect
    .poll(() => guest.evaluate(() => sys().roster.list().map((c: { name: string }) => c.name)), { timeout: 30_000 })
    .toEqual(['Pebble'])
  await expect
    .poll(() => host.evaluate(() => sys().roster.count()), { timeout: 30_000 })
    .toBe(0)
})
