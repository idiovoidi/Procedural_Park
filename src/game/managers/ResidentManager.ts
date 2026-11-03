import { disposeThreeObject } from '@core/utils'
import type { CameraController } from '@systems/camera'
import { type CreatureInstance, spawnCreatureAt } from '@systems/creatures'
import type { PenGrid } from '@systems/park'
import { clampToPen, pointInPen } from '@systems/park'
import type { OwnedCreature, Roster } from '@systems/roster'
import * as THREE from 'three'

/** Scale of a young creature compared with an adult. */
const STAGE_SCALE: Record<OwnedCreature['ageStage'], number> = {
  hatchling: 0.5,
  juvenile: 0.75,
  adult: 1,
}

/** Residents farther than this from the camera are left frozen to save work. */
const ACTIVE_RANGE_M = 70

interface Resident {
  instance: CreatureInstance
  penId: string
  stage: OwnedCreature['ageStage']
}

interface Dependencies {
  scene: THREE.Scene
  roster: Roster
  grid: PenGrid
  camera: CameraController
  heightAt: (x: number, z: number) => number
}

/**
 * ResidentManager
 * Shows the creatures the player owns, wandering inside their pens.
 *
 * Only roster creatures assigned to a *closed* pen are drawn: when a pen is opened (or the
 * creature is sold or moved) its model is removed, and it comes back when the pen closes again.
 * Movement uses the ordinary creature behaviour, then the creature is held inside the pen's
 * walls. The care/production simulation does not depend on any of this: it runs from the
 * roster whether or not the creatures are on screen.
 */
export class ResidentManager {
  private readonly deps: Dependencies
  private readonly residents = new Map<string, Resident>()
  private readonly unsubscribe: Array<() => void> = []
  private visible = true

  constructor(deps: Dependencies) {
    this.deps = deps
    // Roster changes that matter for what is on screen (not every care-cycle stat tick).
    this.unsubscribe.push(
      deps.roster.onChange((change) => {
        if (change.reason !== 'stats' && change.reason !== 'name') this.sync()
      })
    )
    this.unsubscribe.push(deps.grid.onEdit(() => this.sync()))
    this.sync()
  }

  /** Hide the residents while away from the hub (they keep living on the economy clock). */
  public setVisible(visible: boolean): void {
    this.visible = visible
    for (const r of this.residents.values()) r.instance.group.visible = visible
  }

  /** Number of creatures currently drawn in pens. */
  public count(): number {
    return this.residents.size
  }

  /** Every drawn resident, e.g. so a card can be exported of one in view. */
  public getInstances(): CreatureInstance[] {
    return [...this.residents.values()].map((r) => r.instance)
  }

  /** The drawn instance of a roster creature, if it is currently in a closed pen. */
  public getInstance(creatureId: string): CreatureInstance | undefined {
    return this.residents.get(creatureId)?.instance
  }

  /** Bring the drawn creatures in line with the roster and the pens. */
  public sync(): void {
    const { roster, grid } = this.deps

    const wanted = new Map<string, OwnedCreature>()
    for (const creature of roster.list()) {
      if (creature.penId && grid.getPen(creature.penId)) wanted.set(creature.id, creature)
    }

    for (const [id, resident] of this.residents) {
      const creature = wanted.get(id)
      if (!creature || creature.penId !== resident.penId) this.remove(id)
    }

    let index = 0
    for (const creature of wanted.values()) {
      const existing = this.residents.get(creature.id)
      if (existing) {
        if (existing.stage !== creature.ageStage) {
          existing.stage = creature.ageStage
          existing.instance.group.scale.setScalar(STAGE_SCALE[creature.ageStage])
        }
      } else {
        this.add(creature, index)
      }
      index++
    }
  }

  private add(creature: OwnedCreature, index: number): void {
    const { scene, grid, heightAt } = this.deps
    const pen = grid.getPen(creature.penId as string)
    if (!pen) return

    // Start spread out across the pen rather than all in one spot.
    const spot = pointInPen(pen.cells, index + hashId(creature.id))
    const instance = spawnCreatureAt(
      scene,
      new THREE.Vector3(spot.x, heightAt(spot.x, spot.z), spot.z),
      creature.genome,
      { groundHeightAt: heightAt }
    )
    instance.group.scale.setScalar(STAGE_SCALE[creature.ageStage])
    instance.group.visible = this.visible
    this.residents.set(creature.id, {
      instance,
      penId: creature.penId as string,
      stage: creature.ageStage,
    })
  }

  private remove(id: string): void {
    const resident = this.residents.get(id)
    if (!resident) return
    this.deps.scene.remove(resident.instance.group)
    disposeThreeObject(resident.instance.group)
    this.residents.delete(id)
  }

  /** Per-frame: run behaviour for nearby residents and keep them inside their walls. */
  public update(dt: number, nowSeconds: number): void {
    const { grid, camera } = this.deps
    const cam = camera.camera
    const camPos = cam.position

    for (const resident of this.residents.values()) {
      const { instance } = resident
      const pos = instance.group.position
      if (Math.hypot(pos.x - camPos.x, pos.z - camPos.z) > ACTIVE_RANGE_M) continue

      instance.update(dt, nowSeconds, cam, [])

      const pen = grid.getPen(resident.penId)
      if (!pen) continue
      const inside = clampToPen(pen.cells, instance.anchor.x, instance.anchor.z)
      instance.anchor.x = inside.x
      instance.anchor.z = inside.z
      instance.group.position.x = inside.x
      instance.group.position.z = inside.z
    }
  }

  public dispose(): void {
    for (const off of this.unsubscribe) off()
    for (const id of [...this.residents.keys()]) this.remove(id)
  }
}

/** A small stable number from a creature id like "c12". */
function hashId(id: string): number {
  return Number(id.replace(/\D/g, '')) || 0
}
