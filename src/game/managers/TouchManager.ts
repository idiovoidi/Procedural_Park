import type { GameSystems } from '../SystemsCoordinator'

/** Whether to show touch controls: forced by `?touch=1` / `?touch=0`, else on touch-first devices. */
export function wantsTouchControls(search: string, coarsePointer: boolean): boolean {
  const flag = new URLSearchParams(search).get('touch')
  if (flag === '1') return true
  if (flag === '0') return false
  return coarsePointer
}

/**
 * TouchManager
 * Feeds the on-screen touch controls to the input manager (stick, look drag, sprint and the
 * action buttons) and lets build mode place pieces without a mouse.
 */
export class TouchManager {
  private readonly systems: GameSystems
  private readonly enabledByDevice: boolean

  constructor(systems: GameSystems, enabled: boolean) {
    this.systems = systems
    this.enabledByDevice = enabled
  }

  public initialize(): void {
    const { ui, input, build } = this.systems
    const touch = ui.getTouchControls()
    touch.setCallbacks({
      onMove: (x, y) => input.setVirtualMove(x, y),
      onLook: (dx, dy) => input.addVirtualLookDelta(dx, dy),
      onHold: (id, down) => {
        if (id === 'sprint') input.setVirtualSprint(down)
      },
      onPress: (id) => {
        switch (id) {
          case 'jump':
            input.pressAction('camera.jump')
            break
          case 'crate':
            input.pressAction('capture.crate')
            break
          case 'feed':
            input.pressAction('food.feedCreature')
            break
          case 'photo':
            input.pressAction('game.takePhoto')
            break
          case 'place':
            // Taps cannot capture the pointer, so build at the crosshair directly.
            if (build.isActive()) build.placeAtAim()
            else ui.showToast('🔨 Turn on build mode first (Build on the belt)')
            break
        }
      },
    })
    touch.setEnabled(this.enabledByDevice)
    build.setTouchMode(this.enabledByDevice)
  }

  public setEnabled(enabled: boolean): void {
    this.systems.ui.getTouchControls().setEnabled(enabled)
    this.systems.build.setTouchMode(enabled)
  }
}
