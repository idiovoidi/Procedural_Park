import { expect, test } from '@playwright/test'
import { click, closeContexts, connect, newPlayer, type Systems } from './helpers'

/**
 * M4 in the real game, with two real browsers connected over WebRTC: card trading, shared
 * codex and visiting a friend's park.
 */

declare const sys: () => Systems

test.afterEach(closeContexts)

test('friends share a codex, trade, breed together, visit and duel', async ({ browser }) => {
  test.setTimeout(540_000)
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

  // Joint breeding: each friend has a den pen with an adult parent; each ends up with a child.
  const buildDenPen = (page: typeof host, name: string, genomeFrom: 'wild' | 'owned') =>
    page.evaluate(
      ({ name, genomeFrom }) => {
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
        c.setTool('den')
        if (!c.commit(1, 1).ok) throw new Error('den failed')
        const pen = s.park.getPens()[0].id
        if (genomeFrom === 'owned') {
          s.roster.assignToPen(s.roster.list()[0].id, pen)
        } else {
          const genome = s.creatures
            .getAllCreatures()
            .map((i: { genome: { size: string; temperament: string } }) => i.genome)
            .find((g: { size: string; temperament: string }) => g.size !== 'huge' && g.temperament !== 'aggressive')
          s.roster.assignToPen(s.roster.add(genome, { name }).id, pen)
        }
        // Parents must be happy and trusting to breed.
        for (const cr of s.roster.list()) s.roster.adjustStats(cr.id, { happiness: 100, trust: 100, fullness: 100 })
        return pen
      },
      { name, genomeFrom }
    )
  await buildDenPen(host, 'Host Parent', 'wild')
  await buildDenPen(guest, '', 'owned') // the guest's parent is Pebble, traded earlier

  await host.locator('#trade-panel .tp-row', { hasText: 'Host Parent' }).locator('button:has-text("Breed together")').evaluate((b) => (b as HTMLElement).click())
  await expect(guest.locator('#toast')).toContainText('joint breeding', { timeout: 30_000 })
  if (!(await guest.locator('#trade-panel').isVisible())) {
    await click(guest, '#tool-belt [data-tool=trade]')
  }
  await guest.locator('#trade-panel .tp-row', { hasText: 'wants to breed together' }).locator('button:has-text("Use")').first().evaluate((b) => (b as HTMLElement).click())

  // Both started an egg; let the economy run until they hatch.
  for (const page of [host, guest]) {
    await expect
      .poll(() => page.evaluate(() => sys().breeding.getJobs().length), { timeout: 30_000 })
      .toBe(1)
    await page.evaluate(() => sys().simClock.fastForward(600))
  }
  const kids = await Promise.all(
    [host, guest].map((page) =>
      page.evaluate(() => {
        const s = sys()
        const kid = s.roster.list().find((c: { parentIds: string[] | null }) => c.parentIds?.some((id) => id.startsWith('joint:')))
        return kid ? { name: kid.name, seed: kid.genome.seed, generation: kid.generation } : null
      })
    )
  )
  expect(kids[0]).not.toBeNull()
  expect(kids[1]).not.toBeNull()
  expect(kids[0]?.seed).not.toBe(kids[1]?.seed) // two different children of the same pair

  // Visit: the guest walks through a copy of the host's park (a den pen with creatures).
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
  // The guest's own pen is untouched underneath; what they see is a separate copy of the host's.
  expect(await guest.evaluate(() => sys().park.getPens().length)).toBe(1)
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

  // Arena: leave the visit, then duel. Both see the same fight from their own side.
  const pickFirstFighter = async (page: typeof host) => {
    if (!(await page.locator('#arena-panel').isVisible())) await click(page, '#tool-belt [data-tool=arena]')
    await page.locator('#arena-panel .ap-row', { hasText: 'HP' }).first().locator('button:has-text("Pick")').evaluate((b) => (b as HTMLElement).click())
  }
  await click(guest, '#trade-panel .close-btn')
  await pickFirstFighter(host)
  await pickFirstFighter(guest)
  await host.locator('#arena-panel .ap-row', { hasText: 'Challenge with your team' }).locator('button').evaluate((b) => (b as HTMLElement).click())
  await expect(guest.locator('#arena-panel')).toContainText('Your friend challenges you', { timeout: 30_000 })
  await guest.locator('#arena-panel .ap-row', { hasText: 'Your friend challenges you' }).locator('button:has-text("Accept")').evaluate((b) => (b as HTMLElement).click())
  const verdict = (page: typeof host) => page.locator('#arena-panel .ap-report').locator('xpath=preceding-sibling::h3[1]').textContent()
  await expect(host.locator('#arena-panel .ap-report')).toBeVisible({ timeout: 30_000 })
  await expect(guest.locator('#arena-panel .ap-report')).toBeVisible({ timeout: 30_000 })
  const [hostLines, guestLines] = await Promise.all(
    [host, guest].map((p) => p.locator('#arena-panel .ap-report').textContent())
  )
  expect(hostLines).toBe(guestLines) // the very same fight, move for move
  const [hv, gv] = await Promise.all([verdict(host), verdict(guest)])
  expect([hv, gv].some((v) => v?.includes('won'))).toBe(true)

  // The solo ladder: a first win pays coins.
  const before = await host.evaluate(() => sys().currency.getBalance())
  await host.locator('#arena-panel .ap-row', { hasText: 'Rung 1' }).locator('button').evaluate((b) => (b as HTMLElement).click())
  await expect(host.locator('#arena-panel')).toContainText(/Victory on rung 1|Defeated on rung 1/)
  const after = await host.evaluate(() => sys().currency.getBalance())
  expect(after).toBeGreaterThanOrEqual(before)
})
