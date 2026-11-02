import { GAME_CONFIG } from '@core/constants'
import { ParkView } from '@rendering/park/ParkView'
import {
  aimAtGround,
  BUILD_TOOLS,
  BuildController,
  type BuildResult,
  type BuildTarget,
  type BuildTool,
  TOOL_LABELS,
} from '@systems/build'
import type { CameraController } from '@systems/camera'
import type { CurrencyManager } from '@systems/currency'
import type { PenGrid } from '@systems/park'
import type { UIManager } from '@ui/managers'
import * as THREE from 'three'

const { COSTS, MAX_REACH_M } = GAME_CONFIG.ECONOMY.BUILD
const CELL = GAME_CONFIG.PARK.CELL_SIZE_M

const GHOST_COLORS = { place: 0x44ff88, invalid: 0xff4455, remove: 0xffaa33 }

/** Digit key for each tool slot: 1..9, then 0. */
const slotKey = (index: number): string => String((index + 1) % 10)

interface Dependencies {
  scene: THREE.Scene
  camera: CameraController
  park: PenGrid
  currency: CurrencyManager
  ui: UIManager
  heightAt: (x: number, z: number) => number
}

/**
 * BuildModeManager
 * Lets the player build the hub in first person: aim with the crosshair, see a coloured
 * ghost of what would be built, click to build and right-click to remove. The rules live in
 * BuildController; this class only turns camera, keys and clicks into calls to it, and draws
 * the ghost. The built park itself is drawn by ParkView, which is always on.
 */
export class BuildModeManager {
  private readonly deps: Dependencies
  private readonly controller: BuildController
  private readonly view: ParkView
  private readonly ghost: THREE.Mesh
  private active = false
  private lastTarget: BuildTarget | null = null

  constructor(deps: Dependencies) {
    this.deps = deps
    this.controller = new BuildController(deps.park, deps.currency)
    this.view = new ParkView(deps.scene, deps.park, deps.heightAt)

    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false })
    )
    this.ghost.visible = false
    this.ghost.renderOrder = 2
    deps.scene.add(this.ghost)

    const hud = deps.ui.getBuildHud()
    hud.setTools(
      BUILD_TOOLS.map((tool, i) => ({
        id: tool,
        key: slotKey(i),
        label: TOOL_LABELS[tool],
        cost: tool === 'remove' ? null : COSTS[tool as keyof typeof COSTS],
      }))
    )
    hud.setActive(this.controller.getTool())

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('contextmenu', this.onContextMenu)
  }

  public isActive(): boolean {
    return this.active
  }

  /** What the last frame's aim would build or remove (null when not aiming at ground). */
  public getLastTarget(): BuildTarget | null {
    return this.lastTarget
  }

  public getController(): BuildController {
    return this.controller
  }

  public toggle(): void {
    if (this.active) this.disable()
    else this.enable()
  }

  public enable(): void {
    if (this.active) return
    this.active = true
    const { camera, ui } = this.deps
    // Building is a first-person activity: leave the automatic ride.
    if (camera.getMode() === 'ride') camera.setMode('freeroam')
    ui.getBuildHud().show()
    ui.showToast('🔨 Build mode: click to build, right-click to remove')
  }

  public disable(): void {
    if (!this.active) return
    this.active = false
    this.ghost.visible = false
    this.lastTarget = null
    this.deps.ui.getBuildHud().hide()
  }

  public selectTool(tool: BuildTool): void {
    this.controller.setTool(tool)
    this.deps.ui.getBuildHud().setActive(this.controller.getTool())
  }

  /** The world point the crosshair is aimed at on the ground, or null. */
  public getAimPoint(): { x: number; z: number } | null {
    const { camera } = this.deps
    const origin = camera.camera.position
    const dir = camera.camera.getWorldDirection(new THREE.Vector3())
    const floorY = this.deps.heightAt(origin.x + dir.x * 3, origin.z + dir.z * 3)
    return aimAtGround(origin, dir, floorY, MAX_REACH_M)
  }

  /** Build (or remove, with the remove tool) at whatever the crosshair is aimed at. */
  public placeAtAim(): BuildResult | null {
    const point = this.getAimPoint()
    if (!point) return null
    const result = this.controller.commit(point.x, point.z)
    this.deps.ui.showToast(result.ok ? `🔨 ${result.message}` : `⚠️ ${result.message}`)
    return result
  }

  /** Called every frame while the game is running. */
  public update(): void {
    if (!this.active) return

    const point = this.getAimPoint()
    const target = point ? this.controller.preview(point.x, point.z) : null
    this.lastTarget = target
    this.updateGhost(target)
    this.updateStatus(target)
  }

  private updateStatus(target: BuildTarget | null): void {
    const hud = this.deps.ui.getBuildHud()
    if (!target) {
      hud.setStatus('Aim at the ground', 'neutral')
      return
    }
    if (!target.valid) {
      hud.setStatus(target.reason ?? 'Cannot build here', 'bad')
      return
    }
    const parts: string[] = []
    if (target.action === 'remove') {
      parts.push(`Remove ${target.label}`)
      if (target.refund > 0) parts.push(`+🪙 ${target.refund}`)
    } else {
      parts.push(`${target.action === 'replace' ? 'Replace with' : 'Build'} ${target.label}`)
      const net = target.cost - target.refund
      if (net > 0) parts.push(`-🪙 ${net}`)
    }
    hud.setStatus(parts.join('  '), 'good')
  }

  private updateGhost(target: BuildTarget | null): void {
    if (!target) {
      this.ghost.visible = false
      return
    }
    const { heightAt } = this.deps
    const color = !target.valid
      ? GHOST_COLORS.invalid
      : target.action === 'remove'
        ? GHOST_COLORS.remove
        : GHOST_COLORS.place
    ;(this.ghost.material as THREE.MeshBasicMaterial).color.setHex(color)

    if (target.kind === 'edge' && target.edge) {
      const e = target.edge
      const alongX = e.axis === 'h'
      const height = target.tool === 'tallFence' ? 3 : target.tool === 'gate' ? 1.05 : 1.2
      const cx = alongX ? (e.x + 0.5) * CELL : e.x * CELL
      const cz = alongX ? e.z * CELL : (e.z + 0.5) * CELL
      this.ghost.scale.set(alongX ? CELL : 0.22, height, alongX ? 0.22 : CELL)
      this.ghost.position.set(cx, heightAt(cx, cz) + height / 2, cz)
    } else {
      const cx = (target.cell.x + 0.5) * CELL
      const cz = (target.cell.z + 0.5) * CELL
      const isRoof = target.tool === 'roof'
      const height = isRoof ? 0.15 : 0.9
      this.ghost.scale.set(CELL * 0.9, height, CELL * 0.9)
      this.ghost.position.set(cx, heightAt(cx, cz) + (isRoof ? 3.4 : height / 2), cz)
    }
    this.ghost.visible = true
  }

  // ---- Input ----------------------------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.active || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key < '0' || e.key > '9' || e.key.length !== 1) return
    const index = (Number(e.key) + 9) % 10 // '1' -> 0 ... '9' -> 8, '0' -> 9
    const tool = BUILD_TOOLS[index]
    if (tool) this.selectTool(tool)
  }

  private onMouseDown = (e: MouseEvent): void => {
    // Only act on clicks in the 3D view with the mouse captured. The first click into the
    // game just captures the pointer, so it must not also build.
    if (!this.active || !document.pointerLockElement) return
    if (!(e.target instanceof HTMLCanvasElement)) return

    if (e.button === 0) {
      this.placeAtAim()
    } else if (e.button === 2) {
      const previous = this.controller.getTool()
      this.controller.setTool('remove')
      this.placeAtAim()
      this.controller.setTool(previous)
    }
  }

  private onContextMenu = (e: MouseEvent): void => {
    if (this.active && e.target instanceof HTMLCanvasElement) e.preventDefault()
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('contextmenu', this.onContextMenu)
    this.view.dispose()
    this.ghost.removeFromParent()
    this.ghost.geometry.dispose()
    ;(this.ghost.material as THREE.Material).dispose()
  }
}
