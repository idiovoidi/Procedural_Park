import { expect, test } from '@playwright/test'

/**
 * M5-M6 depth in the real game (single player): the breeding panel warns about inbreeding, and
 * a hired keeper keeps a pen fed with no player action.
 */

// biome-ignore lint/suspicious/noExplicitAny: test pokes at the running game
declare const sys: () => any

test.use({ viewport: { width: 640, height: 420 } })

test('inbreeding is flagged, and a keeper looks after a pen', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  await page.addInitScript(() => {
    ;(window as unknown as { sys: () => unknown }).sys = () =>
      (window as unknown as { game: { systems: unknown } }).game.systems
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await page.waitForSelector('#tool-belt .tb-slot', { timeout: 120_000 })

  // A pen with a trough, a bin and a den, and a family living in it.
  const setup = await page.evaluate(() => {
    const s = sys()
    s.currency.addMoney(1500, 'test')
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
    for (const [tool, x, z] of [
      ['trough', 1, 1],
      ['bin', 3, 1],
      ['den', 5, 1],
    ] as const) {
      c.setTool(tool)
      if (!c.commit(x, z).ok) throw new Error(`${tool} failed`)
    }
    const pen = s.park.getPens()[0].id
    const genome = s.creatures
      .getAllCreatures()
      .map((i: { genome: { size: string; temperament: string } }) => i.genome)
      .find((g: { size: string; temperament: string }) => g.size === 'small' && g.temperament !== 'aggressive')
    const stats = { fullness: 100, happiness: 100, trust: 100 }
    const parent = s.roster.add(genome, { name: 'Elder', penId: pen, stats })
    const mate = s.roster.add(genome, { name: 'Mate', penId: pen, stats })
    // A child of Elder and Mate: any pairing with Elder is parent x child.
    const kid = s.roster.add(genome, { name: 'Kid', penId: pen, stats, parentIds: [parent.id, mate.id] })
    return { pen, parent: parent.id, kid: kid.id, inbred: s.roster.get(kid.id).inbreeding }
  })
  expect(setup.inbred).toBe(0) // an outcross to begin with

  // Pick Elder and Kid in the breeding panel: the warning appears.
  await page.click('#tool-belt [data-tool=breed]')
  await expect(page.locator('#breeding-panel')).toBeVisible()
  const selects = page.locator('#breeding-panel select')
  await selects.nth(1).selectOption(setup.parent)
  await selects.nth(2).selectOption(setup.kid)
  await expect(page.locator('#breeding-panel .breed-odds')).toContainText('inbred', { timeout: 15_000 })
  await expect(page.locator('#breeding-panel .breed-odds')).toContainText('parent and child')
  await page.click('#breeding-panel .close-btn')

  // Hire a keeper with real clicks; with no food and nobody feeding, the pen stays fed.
  await page.click('#tool-belt [data-tool=staff]')
  await expect(page.locator('#staff-panel')).toBeVisible()
  await page.locator('#staff-panel .sp-row', { hasText: setup.pen }).locator('button:has-text("Hire")').click()
  await expect(page.locator('#staff-panel .sp-row', { hasText: setup.pen })).toContainText('Dismiss', { timeout: 15_000 })

  const after = await page.evaluate(() => {
    const s = sys()
    const before = s.currency.getBalance()
    s.simClock.fastForward(30 * 60)
    return {
      starving: s.roster.list().filter((c: { fullness: number }) => c.fullness <= 0).length,
      spent: before - s.currency.getBalance(),
    }
  })
  expect(after.starving).toBe(0)
  expect(after.spent).toBeGreaterThan(0) // wages and food

  expect(errors.filter((e) => !/favicon|WebGL|GPU stall/i.test(e))).toEqual([])
})
