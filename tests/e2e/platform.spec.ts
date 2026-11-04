import { expect, test } from '@playwright/test'

/**
 * M7 platform polish in the real game: virtual (gamepad/touch) input moves and looks, the touch
 * controls work with real pointer events, settings apply and persist, and the panels are
 * keyboard- and screen-reader-friendly.
 */

// biome-ignore lint/suspicious/noExplicitAny: test pokes at the running game
declare const sys: () => any

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { sys: () => unknown }).sys = () =>
      (window as unknown as { game: { systems: unknown } }).game.systems
  })
})

async function ready(page: import('@playwright/test').Page, url = './') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url)
  await page.waitForSelector('#tool-belt button.tb-slot', { timeout: 120_000 })
  await page.waitForFunction(() => !!(window as unknown as { game?: { systems?: unknown } }).game?.systems)
  return errors
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 900, height: 600 } })

  test('virtual input drives the camera and actions', async ({ page }) => {
    test.setTimeout(180_000)
    const errors = await ready(page)
    await page.evaluate(() => {
      const s = sys()
      if (s.camera.getMode() === 'ride') s.camera.toggleMode()
    })
    const where = () =>
      page.evaluate(() => {
        const c = sys().camera.camera
        return { x: c.position.x, z: c.position.z, yaw: c.rotation.y }
      })
    const a = await where()
    await page.evaluate(() => sys().input.setVirtualMove(0, 1)) // a stick pushed forward
    await page.waitForTimeout(1500)
    await page.evaluate(() => sys().input.setVirtualMove(0, 0))
    const b = await where()
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.3)

    await page.evaluate(() => sys().input.setVirtualLookRate(1, 0))
    await page.waitForTimeout(1500)
    await page.evaluate(() => sys().input.setVirtualLookRate(0, 0))
    expect(Math.abs((await where()).yaw - b.yaw)).toBeGreaterThan(0.02)

    await page.evaluate(() => sys().input.pressAction('market.toggle')) // a controller button
    await expect.poll(() => page.evaluate(() => sys().ui.getMarketPanel().isOpen())).toBe(true)
    expect(errors.filter((e) => !/favicon|WebGL|GPU stall/i.test(e))).toEqual([])
  })

  test('panels are dialogs, focus moves in and back, and Escape closes them', async ({ page }) => {
    test.setTimeout(180_000)
    await ready(page)
    await page.click('#tool-belt [data-tool=market]')
    const market = page.locator('#market-panel')
    await expect(market).toHaveAttribute('role', 'dialog')
    await expect(market).toHaveAttribute('aria-label', 'Market')
    await expect(page.locator('#tool-belt [data-tool=market]')).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.getElementById('market-panel')?.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(market).toBeHidden()
    // Escape closed the panel instead of also opening Settings, and focus went back to the belt.
    expect(await page.evaluate(() => document.getElementById('settings-panel')?.classList.contains('hidden'))).toBe(true)
    expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.tool)).toBe('market')
  })

  test('display settings apply, persist and survive a reload', async ({ page }) => {
    test.setTimeout(240_000)
    await ready(page)
    await page.evaluate(() => document.getElementById('toggleSettings')?.click())
    await page.selectOption('#uiScaleSelect', '1.3')
    await page.check('#highContrast')
    await page.check('#reducedMotion')
    await page.selectOption('#qualitySelect', 'low')

    const applied = await page.evaluate(() => ({
      classes: document.documentElement.className,
      scale: document.documentElement.dataset.uiScale,
      ratio: sys().scene.getPixelRatio(),
      shadows: sys().scene.renderer.shadowMap.enabled,
      grain: sys().scene.getShaderConfig().filmGrainIntensity,
    }))
    expect(applied.classes).toContain('high-contrast')
    expect(applied.classes).toContain('reduce-motion')
    expect(applied.scale).toBe('1.3')
    expect(applied.ratio).toBeLessThanOrEqual(1)
    expect(applied.shadows).toBe(false)
    expect(applied.grain).toBe(0) // no animated film grain under reduced motion

    await page.reload()
    await page.waitForFunction(() => !!(window as unknown as { game?: { systems?: unknown } }).game?.systems)
    await expect(page.locator('#qualitySelect')).toHaveValue('low')
    await expect(page.locator('#uiScaleSelect')).toHaveValue('1.3')
    expect(await page.evaluate(() => document.documentElement.classList.contains('high-contrast'))).toBe(true)
  })
})

test.describe('touch', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true })

  test('the touch controls move, look and build with real pointer events', async ({ page }) => {
    test.setTimeout(180_000)
    const errors = await ready(page, './?touch=1')
    await expect(page.locator('#touch-controls')).toBeVisible()
    await page.evaluate(() => {
      const s = sys()
      if (s.camera.getMode() === 'ride') s.camera.toggleMode()
    })
    const where = () =>
      page.evaluate(() => {
        const c = sys().camera.camera
        return { x: c.position.x, z: c.position.z, yaw: c.rotation.y }
      })
    const a = await where()

    // Drag the left zone upward: the stick reads forward, then releases to zero.
    await page.evaluate(() => {
      const z = document.querySelector('#touch-controls .tc-move') as HTMLElement
      const fire = (type: string, x: number, y: number) =>
        z.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true }))
      fire('pointerdown', 120, 260)
      fire('pointermove', 120, 200)
    })
    expect(await page.evaluate(() => sys().input.getVirtualMove())).toEqual({ x: 0, y: 1 })
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      ;(document.querySelector('#touch-controls .tc-move') as HTMLElement).dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 7, bubbles: true })
      )
    })
    expect(await page.evaluate(() => sys().input.getVirtualMove())).toEqual({ x: 0, y: 0 })
    const b = await where()
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.3)

    // Drag the right zone sideways to look around.
    await page.evaluate(() => {
      const z = document.querySelector('#touch-controls .tc-look') as HTMLElement
      const fire = (type: string, x: number, y: number) =>
        z.dispatchEvent(new PointerEvent(type, { pointerId: 9, clientX: x, clientY: y, bubbles: true }))
      fire('pointerdown', 400, 150)
      for (let i = 1; i <= 20; i++) fire('pointermove', 400 + i * 8, 150)
      fire('pointerup', 560, 150)
    })
    await page.waitForTimeout(800)
    expect(Math.abs((await where()).yaw - b.yaw)).toBeGreaterThan(0.1)

    // The build button works without pointer lock.
    await page.click('#tool-belt [data-tool=build]')
    await page.click('#touch-controls [data-touch=place]')
    await expect(page.locator('#build-hud .bh-status')).not.toContainText('capture the mouse')
    expect(errors.filter((e) => !/favicon|WebGL|GPU stall/i.test(e))).toEqual([])
  })
})
