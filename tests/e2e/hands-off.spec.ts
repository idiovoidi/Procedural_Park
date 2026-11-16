import { expect, test } from '@playwright/test'

/**
 * M2 exit in the real game: a pen with a trough, hopper, bin, auto-collector, farms, valve and
 * silo, stocked once, runs unattended for half an hour of game time, earns by itself, and the
 * Market panel shows the valve's price floor.
 */

// biome-ignore lint/suspicious/noExplicitAny: test pokes at the running game
declare const sys: () => any

test.use({ viewport: { width: 640, height: 420 } })

test('a stocked pen runs hands-off and sells by itself', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  await page.addInitScript(() => {
    ;(window as unknown as { sys: () => unknown }).sys = () =>
      (window as unknown as { game: { systems: unknown } }).game.systems
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await page.waitForSelector('#tool-belt .tb-slot', { timeout: 120_000 })

  const result = await page.evaluate(async () => {
    const s = sys()
    s.currency.addMoney(3000, 'test')
    const c = s.build.getController()
    const place = (tool: string, x: number, z: number) => {
      c.setTool(tool)
      const r = c.commit(x, z)
      if (!r.ok) throw new Error(`${tool}: ${r.message}`)
    }
    // A 3x3 pen at the origin (cells are 2 m).
    for (let i = 0; i < 3; i++) {
      const mid = (i + 0.5) * 2
      place('fence', mid, 0)
      place('fence', mid, 6)
      place('fence', 0, mid)
      place('fence', 6, mid)
    }
    const cell = (x: number, z: number): [number, number] => [(x + 0.5) * 2, (z + 0.5) * 2]
    place('trough', ...cell(0, 0))
    place('hopper', ...cell(1, 0))
    place('bin', ...cell(2, 0))
    place('collector', ...cell(0, 1))
    place('farm', ...cell(1, 1))
    place('farm', ...cell(2, 1))
    place('valve', ...cell(0, 2))
    place('silo', ...cell(1, 2))

    const pen = s.park.getPens()[0]
    const genome = s.creatures
      .getAllCreatures()
      .map((i: { genome: unknown }) => i.genome)
      .find((g: { size: string; temperament: string }) => g.size !== 'huge' && g.temperament !== 'aggressive')
    const eco = await import('/Procedural_Park/src/systems/economy/index.ts')
    const best = eco.rankFoods(genome)[0].foodId
    const stats = { fullness: 100, happiness: 100, trust: 100 }
    for (let i = 0; i < 2; i++) s.roster.assignToPen(s.roster.add(genome, { stats }).id, pen.id)
    s.care.stock(pen.id, best, 60)

    const before = s.currency.getBalance()
    s.simClock.fastForward(30 * 60)
    return {
      earned: s.currency.getBalance() - before,
      starving: s.roster.list().filter((cr: { fullness: number }) => cr.fullness <= 0).length,
    }
  })

  expect(result.starving).toBe(0)
  expect(result.earned).toBeGreaterThan(0)

  await page.click('#tool-belt [data-tool=market]')
  await expect(page.locator('#market-panel')).toContainText('Auto-sell floor')
  expect(errors.filter((e) => !/favicon|WebGL|GPU stall/i.test(e))).toEqual([])
})
