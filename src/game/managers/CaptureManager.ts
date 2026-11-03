import { GAME_CONFIG } from '@core/constants'
import { disposeThreeObject } from '@core/utils'
import type { CameraController } from '@systems/camera'
import { CaptureSystem, findPenFor } from '@systems/capture'
import type { CreatureInstance } from '@systems/creatures'
import type { CurrencyManager } from '@systems/currency'
import type { FoodManager } from '@systems/food'
import type { MapManager } from '@systems/maps'
import type { PenGrid } from '@systems/park'
import type { Roster } from '@systems/roster'
import type { UIManager } from '@ui/managers'
import * as THREE from 'three'
import type { CreatureManager } from './CreatureManager'

const { CAPTURE_RANGE_M, CRATE_COST, LURE } = GAME_CONFIG.ECONOMY.CAPTURE

interface Dependencies {
  scene: THREE.Scene
  creatures: CreatureManager
  camera: CameraController
  food: FoodManager
  currency: CurrencyManager
  roster: Roster
  park: PenGrid
  maps: MapManager
  ui: UIManager
}

/**
 * CaptureManager
 * Connects capture rules to the world: feeding builds trust, bait pulls creatures in, and a
 * crate takes a trusting creature out of the park and into the roster (and a pen, if one
 * has room). The rules live in CaptureSystem; this class does the moving and removing.
 */
export class CaptureManager {
  private readonly deps: Dependencies
  private readonly system: CaptureSystem<CreatureInstance>
  private marker: THREE.Mesh | null = null
  /** Genome seeds of wild creatures that have been crated, so they never respawn. */
  private captured = new Set<number>()

  constructor(deps: Dependencies) {
    this.deps = deps
    this.system = new CaptureSystem<CreatureInstance>((c) => ({
      x: c.group.position.x,
      z: c.group.position.z,
    }))
  }

  public getSystem(): CaptureSystem<CreatureInstance> {
    return this.system
  }

  public getCapturedSeeds(): number[] {
    return [...this.captured]
  }

  /** Replace the crated list (from a save) and take those creatures out of the wild. */
  public restoreCaptured(seeds: Iterable<number>): void {
    this.captured = new Set(seeds)
    this.applyCaptured()
  }

  /** Remove any wild creature that has already been crated (call after a respawn). */
  public applyCaptured(): void {
    const { creatures } = this.deps
    for (const creature of [...creatures.getCreatures()]) {
      if (this.captured.has(creature.genome.seed)) creatures.removeCreature(creature)
    }
  }

  /** A wild creature was just fed: tell the player how its trust is coming along. */
  public onFed(creature: CreatureInstance, foodId: string): void {
    const r = this.system.feed(creature, foodId)
    const { ui } = this.deps
    if (r.ready) {
      ui.showToast('🤝 It trusts you now! Press Y to crate it')
    } else {
      ui.showToast(`🤝 Trust ${Math.round(r.trust)}/${r.required}`)
    }
  }

  /** Drop the selected food as bait a few metres ahead. */
  public placeLure(): void {
    const { food, camera, ui, scene } = this.deps
    const selected = food.getSelectedFood()
    if (!selected || selected.quantity <= 0) {
      ui.showToast('❌ Select a food (B) to use as bait')
      return
    }

    const pos = camera.camera.position
    const dir = camera.camera.getWorldDirection(new THREE.Vector3())
    const flat = Math.hypot(dir.x, dir.z) || 1
    const x = pos.x + (dir.x / flat) * 4
    const z = pos.z + (dir.z / flat) * 4

    if (!this.system.placeLure(x, z, selected.id)) return
    food.removeFood(selected.id, 1)
    ui.showToast(`🪤 Bait set for ${LURE.DURATION_S}s: wait nearby and watch`)
    ui.updateFoodInventory(food.getInventory())

    this.removeMarker()
    this.marker = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.12, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.8 })
    )
    this.marker.rotation.x = Math.PI / 2
    this.marker.position.set(x, 0.15, z)
    scene.add(this.marker)
  }

  /** Try to crate the nearest creature. */
  public tryCapture(): void {
    const { creatures, camera, currency, roster, park, ui, maps } = this.deps
    if (!maps.canCrate()) {
      ui.showToast('📦 Your crates are full: head home first (Maps)')
      return
    }
    const pos = camera.camera.position
    const from = { x: pos.x, z: pos.z }

    // Look slightly beyond capture range so "too far" can be reported helpfully.
    const target = this.system.nearest(
      creatures.getCreatures().filter((c) => creatures.isPresent(c)),
      from,
      CAPTURE_RANGE_M * 2
    )
    if (!target) {
      ui.showToast('❌ No creature nearby')
      return
    }

    const check = this.system.check(target, from)
    if (!check.ok) {
      ui.showToast(
        check.reason === 'tooFar'
          ? `❌ Get closer (within ${CAPTURE_RANGE_M}m)`
          : `❌ It doesn't trust you yet (${Math.round(check.trust)}/${check.required}). Feed it`
      )
      return
    }
    if (!currency.canAfford(CRATE_COST)) {
      ui.showToast(`❌ A crate costs 🪙 ${CRATE_COST}`)
      return
    }

    currency.removeMoney(CRATE_COST, 'Transport crate')
    const owned = roster.add(target.genome, {
      stats: { trust: Math.round(check.trust) },
    })
    this.system.release(target)
    this.captured.add(target.genome.seed)
    creatures.removeCreature(target)

    // Away from home the crate travels with the player and is delivered on return
    if (!maps.isAtHub()) {
      maps.recordCrate()
      ui.showToast(
        `📦 Crated ${owned.name} (${maps.getTripCrates()}/${GAME_CONFIG.MAPS.CRATE_CARRY_CAPACITY}): it settles in when you get home`
      )
      return
    }

    const penId = findPenFor(park, roster, owned.genome)
    if (penId) {
      roster.assignToPen(owned.id, penId)
      ui.showToast(`📦 ${owned.name} is settling into ${penId}`)
    } else {
      ui.showToast(`📦 Crated ${owned.name}. No pen has room yet: build one (J)`)
    }
  }

  /** Per-frame: run the lure and draw creatures toward it. */
  public update(dt: number): void {
    // Wild creatures on expeditions are skittish: trust fades unless they are tended
    if (!this.deps.maps.isAtHub()) this.system.decay(dt)
    const lure = this.system.getLure()
    if (!lure) {
      this.removeMarker()
      return
    }
    const { creatures } = this.deps
    const attracted = this.system.update(
      dt,
      creatures.getCreatures().filter((c) => creatures.isPresent(c))
    )

    for (const creature of attracted) {
      const dx = lure.x - creature.anchor.x
      const dz = lure.z - creature.anchor.z
      const dist = Math.hypot(dx, dz)
      if (dist < 1.5) continue // close enough: let it hang around the bait
      const step = Math.min(dist, LURE.PULL_SPEED_M_S * dt)
      creature.anchor.x += (dx / dist) * step
      creature.anchor.z += (dz / dist) * step
    }

    if (!this.system.getLure()) this.removeMarker()
  }

  private removeMarker(): void {
    if (!this.marker) return
    this.deps.scene.remove(this.marker)
    disposeThreeObject(this.marker)
    this.marker = null
  }
}
