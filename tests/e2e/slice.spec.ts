import { expect, type Page, test } from '@playwright/test'

/**
 * End-to-end test of the M1 vertical slice, in the real game in a real browser:
 * build a pen with a trough, a bin and a breeding den, house two creatures, let the economy run,
 * sell at the market, breed and hatch a child, read it in the Ranch Book, and get it all
 * back after a reload.
 *
 * The 3D aim (pointer lock) is not simulated: placement goes through the same build controller
 * the mouse uses, while every panel is driven with real clicks on the real DOM.
 */

// Runtime-only view of `window.game` (not type-checked against src).
// biome-ignore lint/suspicious/noExplicitAny: test pokes at the running game
type Systems = any
// `sys()` is defined in the page by `boot` (functions passed to evaluate run in the browser).
declare const sys: () => Systems

const CELL = 2

async function boot(page: Page): Promise<string[]> {
  const errors: string[] = []
  await page.addInitScript(() => {
    ;(window as unknown as { sys: () => unknown }).sys = () =>
      (window as unknown as { game: { systems: unknown } }).game.systems
  })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('./')
  await page.waitForSelector('#tool-belt .tb-slot', { timeout: 120_000 })
  return errors
}

// Small viewport: software-rendered WebGL on a CPU-only runner is slow.
test.use({ viewport: { width: 640, height: 420 } })

test('slice: build, house, earn, breed, read, reload', async ({ page }) => {
  test.setTimeout(420_000)
  const errors = await boot(page)

  // --- Build a 3x3 pen with a trough and a breeding den ---------------------------------------
  await page.click('#tool-belt [data-tool=build]')
  await expect(page.locator('#tool-belt [data-tool=build]')).toHaveClass(/active/)

  const penId = await page.evaluate(
    async ({ CELL }) => {
      const s = sys()
      s.currency.addMoney(2000, 'test')
      const c = s.build.getController()
      const place = (tool: string, x: number, z: number) => {
        c.setTool(tool)
        const r = c.commit(x, z)
        if (!r.ok) throw new Error(`${tool} at ${x},${z}: ${r.message}`)
      }
      // Fence ring around cells 0..2 x 0..2: edges sit on the cell borders.
      for (let i = 0; i < 3; i++) {
        const mid = (i + 0.5) * CELL
        place('fence', mid, 0)
        place('fence', mid, 3 * CELL)
        place('fence', 0, mid)
        place('fence', 3 * CELL, mid)
      }
      place('trough', 0.5 * CELL, 0.5 * CELL)
      place('den', 1.5 * CELL, 0.5 * CELL)
      place('bin', 2.5 * CELL, 0.5 * CELL)
      return s.park.getPens()[0]?.id as string
    },
    { CELL }
  )
  expect(penId).toBeTruthy()

  // --- House two adults of one species and feed the trough --------------------------------------
  const ids = await page.evaluate(
    async ({ penId }) => {
      const s = sys()
      const genome = s.creatures.getAllCreatures()[0].genome
      const stats = { fullness: 100, happiness: 100, trust: 100 }
      const a = s.roster.add(genome, { name: 'Alder', stats })
      const b = s.roster.add(genome, { name: 'Birch', stats })
      s.roster.assignToPen(a.id, penId)
      s.roster.assignToPen(b.id, penId)
      const eco = await import('/Procedural_Park/src/systems/economy/index.ts')
      const food = eco.getCreatureEconomyProfile(genome).diet[0].foodId
      s.care.addFood(penId, food, 999)
      return { a: a.id, b: b.id }
    },
    { penId }
  )

  // --- Let the economy run an hour; resources pile up -------------------------------------------
  await page.evaluate(() => sys().simClock.fastForward(3600))
  // Output waits in the pen's bin until the player collects it (the Collect slot, key Q).
  await page.click('#tool-belt [data-tool=collect]')
  const produced = await page.evaluate(() =>
    Object.values(sys().resources.getAll()).reduce((a: number, b) => a + (b as number), 0)
  )
  expect(produced).toBeGreaterThan(0)

  // --- Sell everything through the real Market panel --------------------------------------------
  const before = await page.evaluate(() => sys().currency.getBalance())
  await page.click('#tool-belt [data-tool=market]')
  await expect(page.locator('#market-panel')).toBeVisible()
  await page.locator('#market-panel button', { hasText: 'Sell all' }).first().click()
  await expect
    .poll(() => page.evaluate(() => sys().currency.getBalance()))
    .toBeGreaterThan(before)
  await page.click('#market-panel .close-btn')

  // --- Breed and hatch ----------------------------------------------------------------------------
  const hatched = await page.evaluate(
    async ({ penId, a, b }) => {
      const s = sys()
      s.currency.addMoney(500, 'test')
      // The trough ran dry over the hour: refill it and let them eat, as a player would.
      const eco = await import('/Procedural_Park/src/systems/economy/index.ts')
      const food = eco.getCreatureEconomyProfile(s.roster.get(a).genome).diet[0].foodId
      s.care.addFood(penId, food, 999)
      s.simClock.fastForward(120)
      const started = s.breeding.start(penId, a, b)
      if (!started.ok) return { error: started.reason }
      s.simClock.fastForward(400)
      return { count: s.roster.count(), gen: Math.max(...s.roster.list().map((c: { generation: number }) => c.generation)) }
    },
    { penId, a: ids.a, b: ids.b }
  )
  expect(hatched).toEqual({ count: 3, gen: 1 })

  // --- The Ranch Book lists the family ----------------------------------------------------------
  await page.click('#tool-belt [data-tool=book]')
  await expect(page.locator('#ranch-book')).toBeVisible()
  await expect(page.locator('#ranch-book')).toContainText('Alder')
  await expect(page.locator('#ranch-book')).toContainText('generation 1')
  await page.click('#ranch-book .close-btn')

  // --- The pen inspector reports the pen when we stand in it ------------------------------------
  await page.evaluate(() => {
    const s = sys()
    if (s.camera.getMode() === 'ride') s.camera.toggleMode()
    s.camera.freeRoamPosition.set(3, 1.6, 3)
  })
  await expect(page.locator('#pen-inspector')).toContainText(penId, { timeout: 10_000 })

  // --- Everything survives a reload -------------------------------------------------------------
  const saved = await page.evaluate(() => {
    const s = sys()
    return { creatures: s.roster.count(), coins: s.currency.getBalance(), pens: s.park.getPens().length }
  })
  await page.evaluate(() => {
    const s = sys()
    // Autosave runs on a timer; force one so the reload is deterministic.
    ;(window as unknown as { game: { saveLoad: { autosave(): void } } }).game.saveLoad.autosave()
    return s
  })
  await page.reload()
  await page.waitForSelector('#tool-belt .tb-slot', { timeout: 120_000 })
  const restored = await page.evaluate(() => {
    const s = sys()
    return { creatures: s.roster.count(), coins: s.currency.getBalance(), pens: s.park.getPens().length }
  })
  expect(restored).toEqual(saved)

  expect(errors.filter((e) => !/favicon|WebGL|GPU stall/i.test(e))).toEqual([])
})
