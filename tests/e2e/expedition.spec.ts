import { expect, test } from '@playwright/test'

/**
 * M3 exit in the real game: unlock a second map, travel there, capture a founder the hub never
 * offers, bring it home, and find the ranch exactly as it was left.
 */

// biome-ignore lint/suspicious/noExplicitAny: test pokes at the running game
declare const sys: () => any

test.use({ viewport: { width: 640, height: 420 } })

test('unlock a map, capture a founder, bring it home', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  await page.addInitScript(() => {
    ;(window as unknown as { sys: () => unknown }).sys = () =>
      (window as unknown as { game: { systems: unknown } }).game.systems
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await page.waitForSelector('#tool-belt .tb-slot', { timeout: 120_000 })

  // A pen at the hub with room for the founder, and coins for the crate.
  const home = await page.evaluate(() => {
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
    c.setTool('trough')
    c.commit(1, 1)
    return { pens: s.park.getPens().length, hubWild: s.creatures.getCreatures().length }
  })
  expect(home.pens).toBe(1)

  // Unlock Greenwood and travel there with real clicks.
  await page.click('#tool-belt [data-tool=maps]')
  await page.click('#map-panel [data-map=greenwood] button:has-text("Unlock")')
  await page.click('#map-panel [data-map=greenwood] button:has-text("Travel")')
  await expect
    .poll(() => page.evaluate(() => sys().maps.getCurrentId()), { timeout: 30_000 })
    .toBe('greenwood')

  // On the expedition: its own founders, the ranch is out of reach.
  const away = await page.evaluate(() => {
    const s = sys()
    return { wild: s.creatures.getCreatures().length, building: s.build.isActive() }
  })
  expect(away.wild).toBe(40)
  expect(away.building).toBe(false)

  // Win the trust of a founder that is out in the day, stand next to it, and crate it.
  const crated = await page.evaluate(() => {
    const s = sys()
    const target = s.creatures
      .getCreatures()
      .find(
        (c: { genome: { size: string; temperament: string }; group: { visible: boolean } }) =>
          c.group.visible && c.genome.size !== 'huge' && c.genome.temperament !== 'aggressive'
      )
    if (!target) throw new Error('no suitable founder')
    const system = s.capture.getSystem()
    for (let i = 0; i < 80; i++) system.feed(target, 'berry')
    const p = target.group.position
    s.camera.teleport(p.x + 2, p.z)
    return { name: target.genome.seed, before: s.roster.count() }
  })
  await page.click('#tool-belt [data-tool=crate]')
  const afterCrate = await page.evaluate(() => {
    const s = sys()
    return {
      count: s.roster.count(),
      unpenned: s.roster.getUnassigned().length,
      trip: s.maps.getTripCrates(),
    }
  })
  expect(afterCrate.count).toBe(crated.before + 1)
  expect(afterCrate.unpenned).toBe(1) // still in the crate, travelling with us
  expect(afterCrate.trip).toBe(1)

  // Home again: the founder is delivered to the pen and the ranch is as we left it.
  await page.click('#tool-belt [data-tool=maps]')
  await page.click('#map-panel [data-map=hub] button:has-text("Return home")')
  await expect
    .poll(() => page.evaluate(() => sys().maps.getCurrentId()), { timeout: 30_000 })
    .toBe('hub')
  const back = await page.evaluate(() => {
    const s = sys()
    return {
      pens: s.park.getPens().length,
      wild: s.creatures.getCreatures().length,
      unpenned: s.roster.getUnassigned().length,
    }
  })
  expect(back.pens).toBe(1)
  expect(back.wild).toBeGreaterThan(0)
  expect(back.unpenned).toBe(0)

  expect(errors.filter((e) => !/favicon|WebGL|GPU stall/i.test(e))).toEqual([])
})
