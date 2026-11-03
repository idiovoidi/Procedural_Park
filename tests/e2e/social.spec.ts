import { expect, test } from '@playwright/test'
import { click, closeContexts, connect, newPlayer, type Systems } from './helpers'

/**
 * M4 in the real game, with two real browsers connected over WebRTC: card trading, shared
 * codex and visiting a friend's park.
 */

declare const sys: () => Systems

test.afterEach(closeContexts)

test('friends share a codex and trade a creature', async ({ browser }) => {
  test.setTimeout(420_000)
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

  // Visit: the host builds a pen with a creature in it, the guest walks through a copy.
  await host.evaluate(() => {
    const s = sys()
    s.currency.addMoney(500, 'test')
    const c = s.build.getController()
    for (let i = 0; i < 3; i++) {
      const mid = (i + 0.5) * 2
      for (const [x, z] of [
        [mid, 0],
        [mid, 6],
        [0, mid],
        [6, mid],
      ]) {
        c.setTool('fence')
        if (!c.commit(x, z).ok) throw new Error('fence failed')
      }
    }
    const genome = s.creatures
      .getAllCreatures()
      .map((i: { genome: { size: string; temperament: string } }) => i.genome)
      .find((g: { size: string; temperament: string }) => g.size !== 'huge' && g.temperament !== 'aggressive')
    s.roster.assignToPen(s.roster.add(genome, { name: 'Host Resident' }).id, s.park.getPens()[0].id)
  })
  // The Trade slot toggles: only open the panel if the earlier trade step left it closed.
  if (!(await guest.locator('#trade-panel').isVisible())) {
    await click(guest, '#tool-belt [data-tool=trade]')
  }
  await guest.locator('#trade-panel .tp-row', { hasText: 'Walk through' }).locator('button:has-text("Visit")').evaluate((b) => (b as HTMLElement).click())

  await expect
    .poll(
      () =>
        guest.evaluate(() => {
          const s = sys()
          const own = s.scene.scene.children.filter((o: { name: string }) => o.name === 'ParkView')
          return {
            visiting: s.build.isActive() === false && own.some((o: { visible: boolean }) => !o.visible),
            parks: own.length,
          }
        }),
      { timeout: 30_000 }
    )
    .toEqual({ visiting: true, parks: 2 })
  // The guest has no pens of their own: the pen they see is the host's.
  expect(await guest.evaluate(() => sys().park.getPens().length)).toBe(0)
  const seen = await guest.evaluate(() => {
    const s = sys()
    const parkViews = s.scene.scene.children.filter((o: { name: string }) => o.name === 'ParkView')
    return parkViews.map((g: { visible: boolean; children: unknown[] }) => ({ visible: g.visible, pieces: g.children.length }))
  })
  expect(seen.some((v: { visible: boolean; pieces: number }) => v.visible && v.pieces > 0)).toBe(true)

  // Leaving puts the guest's own park back.
  await click(guest, '#trade-panel .tp-row:has-text("Visiting") button')
  await expect
    .poll(() =>
      guest.evaluate(() => {
        const s = sys()
        return s.scene.scene.children.filter((o: { name: string }) => o.name === 'ParkView').length
      })
    )
    .toBe(1)
})
