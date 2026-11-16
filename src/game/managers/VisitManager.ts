import { ParkView } from '@rendering/park/ParkView'
import type { CreatureInstance } from '@systems/creatures'
import { PenGrid } from '@systems/park'
import { Roster } from '@systems/roster'
import type { ParkSnapshotData } from '@systems/social'
import type { GameSystems } from '../SystemsCoordinator'
import { ResidentManager } from './ResidentManager'

/**
 * VisitManager
 * Shows a friend's park while visiting: the snapshot is restored into a separate grid and
 * roster, drawn with its own ParkView and ResidentManager, and the guest's own park is hidden
 * and locked. Leaving (or the friend disconnecting) throws the copy away.
 */
export class VisitManager {
  private readonly systems: GameSystems
  private view: ParkView | null = null
  private residents: ResidentManager | null = null

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public isVisiting(): boolean {
    return this.view !== null
  }

  /** The friend's creatures currently drawn (for photographing). */
  public getInstances(): CreatureInstance[] {
    return this.residents?.getInstances() ?? []
  }

  /** Per-frame: the friend's creatures wander in their pens. */
  public update(dt: number, now: number): void {
    this.residents?.update(dt, now)
  }

  public begin(snapshot: ParkSnapshotData): void {
    const { scene, build, residents, camera, ui, maps } = this.systems
    if (this.isVisiting()) this.end(false)
    if (!maps.isAtHub()) {
      ui.showToast('🧭 Go home before visiting a friend')
      return
    }

    const grid = new PenGrid()
    const roster = new Roster()
    if (!grid.restore(snapshot.grid) || !roster.restore(snapshot.roster).valid) {
      ui.showToast('⚠️ Could not read your friend’s park')
      return
    }
    const heightAt = (x: number, z: number) => scene.terrainSystem.getFloorHeightAt(x, z)

    build.setHubOpen(false) // hides and locks the guest's own park
    residents.setVisible(false)
    this.view = new ParkView(scene.scene, grid, heightAt)
    this.residents = new ResidentManager({ scene: scene.scene, roster, grid, camera, heightAt })
    ui.showToast(
      `🏡 Visiting your friend’s park: ${grid.getPens().length} pen(s), ${roster.count()} creatures`,
      4000
    )
  }

  /** Leave the friend's park and bring the guest's own back. */
  public end(announce = true): void {
    if (!this.view) return
    const { scene, build, residents, ui } = this.systems
    this.residents?.dispose()
    scene.scene.remove(this.view.group)
    this.view.dispose()
    this.view = null
    this.residents = null
    build.setHubOpen(true)
    residents.setVisible(true)
    if (announce) ui.showToast('🏠 Back in your own park')
  }
}
