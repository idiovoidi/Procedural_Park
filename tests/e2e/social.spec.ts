import { expect, test } from '@playwright/test'
import { click, closeContexts, connect, newPlayer, type Systems } from './helpers'

/**
 * M4 in the real game, with two real browsers connected over WebRTC: card trading, shared
 * codex and visiting a friend's park.
 */

declare const sys: () => Systems

test.afterEach(closeContexts)

test('friends share a codex and trade a creature', async ({ browser }) => {
  test.setTimeout(300_000)
  const host = await newPlayer(browser)
  const guest = await newPlayer(browser)

  // The host has met a species before connecting.
  const early = await host.evaluate(() => {
    const s = sys()
    const g = s.creatures.getAllCreatures()[0].genome
    s.codex.recordPhoto(g)
    return g.speciesId
  })
  await connect(host, guest)

  // Shared codex: what the host already knew arrives on connecting, then new finds as they happen.
  await expect
    .poll(() => guest.evaluate((id) => sys().codex.get(id)?.foundBy ?? null, early), { timeout: 30_000 })
    .toBe('shared')
  const later = await host.evaluate((known) => {
    const s = sys()
    const g = s.creatures.getAllCreatures().map((c: { genome: { speciesId: number } }) => c.genome).find((x: { speciesId: number }) => x.speciesId !== known)
    s.codex.recordPhoto(g)
    return g.speciesId
  }, early)
  await expect
    .poll(() => guest.evaluate((id) => sys().codex.get(id)?.foundBy ?? null, later), { timeout: 30_000 })
    .toBe('shared')
  // ...and a shared species is not yet studied.
  expect(await guest.evaluate((id) => sys().codex.get(id).studied, later)).toBe(false)

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
