/**
 * GameLoop
 * Manages the main game loop and update cycle
 */

import type { GameSystems } from './SystemsCoordinator'

export class GameLoop {
  private systems: GameSystems
  private lastTime = 0
  private isRunning = false
  private animationFrameId: number | null = null

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.lastTime = performance.now()
    this.loop()
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Main game loop
   */
  private loop = (): void => {
    if (!this.isRunning) return

    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.1) // Cap at 100ms
    this.lastTime = now

    this.update(dt, now)

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  /**
   * Update all systems
   */
  private update(dt: number, now: number): void {
    const { state, camera, creatures, scene, multiplayer, ui, debug, input } = this.systems

    // Always update state machine
    state.update(dt)

    // Conditionally update game systems based on state
    if (!state.shouldPauseGameLoop()) {
      // Update camera only if movement is allowed
      if (state.isCameraMovementAllowed()) {
        camera.update(dt)
      }

      // Update creatures
      creatures.update(dt, now / 1000)

      // Update mini map
      this.updateMiniMap()

      // Update park animations
      scene.update(now / 1000)
    }

    // Update multiplayer (even when paused for connection state)
    multiplayer.update(dt)

    // Update sprint indicator
    this.updateSprintIndicator()

    // Update debug panel
    debug.update(dt, scene.renderer, camera.camera, {
      creatures: creatures.getCreatures().length,
      cameraMode: camera.getMode(),
      rideProgress: camera.getRideProgress(),
    })

    // Always render (for pause menu, etc.)
    scene.render(camera.camera, dt)

    // Update input manager at END of frame (clears pressed/released states)
    input.update()
  }

  /**
   * Update mini map
   */
  private updateMiniMap(): void {
    const { ui, camera } = this.systems
    const pos = camera.camera.position
    // TODO: Implement updateMiniMapPlayerPosition in UIManager
    // ui.updateMiniMapPlayerPosition(pos.x, pos.z)
  }

  /**
   * Update sprint indicator
   */
  private updateSprintIndicator(): void {
    const { ui, camera } = this.systems
    if (camera.isSprint()) {
      ui.showSprintIndicator()
    } else {
      ui.hideSprintIndicator()
    }
  }
}
