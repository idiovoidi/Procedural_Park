import { generateWildPopulation, HUB_ID } from '@systems/maps'
import type { GameSystems } from '../SystemsCoordinator'

/** The hub's terrain seed (see SceneManager). */
const HUB_TERRAIN_SEED = 42

/** Where the player arrives on an expedition map, and back at the hub. */
const ARRIVAL = { x: 0, z: 0 }
const HUB_SPAWN = { x: 0, z: 5 }

/**
 * ExpeditionManager
 * Turns a MapManager trip into what is on screen: the hub (terrain, buildings, rails, pens,
 * residents) is swapped for an expedition's own terrain and wild founders, and swapped back on
 * return. The ranch itself keeps running on the economy clock the whole time.
 */
export class ExpeditionManager {
  private readonly systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    this.systems.maps.onTravel((to) => this.arrive(to))
  }

  private arrive(mapId: string): void {
    const { scene, build, residents, creatures, capture, camera, ui, maps } = this.systems
    const experiment = creatures.getExperimentCreature()

    if (mapId === HUB_ID) {
      scene.loadTerrain(HUB_TERRAIN_SEED, true)
      scene.setHubVisible(true)
      build.setHubOpen(true)
      residents.setVisible(true)
      if (experiment) experiment.group.visible = true
      creatures.restoreHubWild()
      capture.applyCaptured()
      camera.teleport(HUB_SPAWN.x, HUB_SPAWN.z)
      ui.showToast('🏠 Back at the hub')
      return
    }

    const def = maps.getCurrentDef()
    if (!def) return
    scene.setHubVisible(false)
    build.setHubOpen(false)
    residents.setVisible(false)
    if (experiment) experiment.group.visible = false
    scene.loadTerrain(def.seed, false)
    creatures.spawnFounders(generateWildPopulation(def), ARRIVAL)
    capture.applyCaptured() // founders already crated stay gone
    camera.teleport(ARRIVAL.x, ARRIVAL.z)
    const hidden = creatures.countHidden()
    ui.showToast(
      hidden > 0
        ? `🧭 ${def.name}: ${hidden} elusive founders only roam at night (Night Mode)`
        : `🧭 ${def.name}: find a founder to bring home`,
      4000
    )
  }
}
