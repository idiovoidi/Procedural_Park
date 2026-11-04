/**
 * Gamepad input
 * Polls the first connected controller once a frame and feeds the input manager: analog movement
 * and look, sprint, and the named actions of the buttons that just went down. All the mapping is
 * in `gamepad.ts`; this only reads the browser's Gamepad API.
 */

import { mapPad, type PadState, readPad } from './gamepad'
import type { InputManager } from './InputManager'

export class GamepadInput {
  private readonly input: InputManager
  private previous: PadState | null = null
  private connected = false
  private onConnectionChange: (connected: boolean) => void = () => {}

  constructor(input: InputManager) {
    this.input = input
  }

  public setOnConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback
  }

  public isConnected(): boolean {
    return this.connected
  }

  /** Call once per frame. Does nothing (and costs nothing) on browsers without a Gamepad API. */
  public update(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return
    const state = readPad(navigator.getGamepads())

    if (!state) {
      if (this.connected) {
        this.connected = false
        this.previous = null
        this.input.setVirtualMove(0, 0)
        this.input.setVirtualLookRate(0, 0)
        this.input.setVirtualSprint(false)
        this.onConnectionChange(false)
      }
      return
    }
    if (!this.connected) {
      this.connected = true
      this.onConnectionChange(true)
    }

    const out = mapPad(state, this.previous)
    this.previous = state
    this.input.setVirtualMove(out.moveX, out.moveY)
    this.input.setVirtualLookRate(out.lookX, out.lookY)
    this.input.setVirtualSprint(out.sprint)
    for (const action of out.pressed) this.input.pressAction(action)
  }
}
