/**
 * Gamepad mapping (GDD 14.3, M7)
 * Turns a controller's raw sticks and buttons into the game's own inputs: analog movement and
 * look, sprint, and the same named actions the keyboard triggers. Pure: it takes a snapshot and
 * the previous one (for "just pressed" edges) and returns what to do, so it is tested without a
 * controller. The layout follows the standard mapping:
 *
 *   left stick move · right stick look · stick click sprint · A jump · X photo · Y build
 *   LT feed · RT crate · LB bait · RB collect · D-pad up market · down breeding den ·
 *   left Ranch Book · right camera mode · Start settings · Back map
 */

import type { InputAction } from './types'

export interface PadState {
  /** Standard mapping: 0 left x, 1 left y, 2 right x, 3 right y (y is down-positive). */
  axes: readonly number[]
  /** Pressed state of each standard button (triggers counted once past half way). */
  buttons: readonly boolean[]
}

export interface PadOutput {
  /** Movement: x right, y forward, each -1..1 with the dead zone removed. */
  moveX: number
  moveY: number
  /** Look rates -1..1: x right, y up. */
  lookX: number
  lookY: number
  sprint: boolean
  /** Actions whose button went down since the last snapshot. */
  pressed: InputAction[]
}

/** Stick travel ignored around the centre, so a resting stick never drifts the camera. */
export const DEADZONE = 0.18

/** Standard-mapping button index -> action. */
export const BUTTON_ACTIONS: Readonly<Record<number, InputAction>> = {
  0: 'camera.jump',
  2: 'game.takePhoto',
  3: 'build.toggle',
  4: 'capture.lure',
  5: 'production.collect',
  6: 'food.feedCreature',
  7: 'capture.crate',
  8: 'ui.toggleMap',
  9: 'ui.toggleSettings',
  12: 'market.toggle',
  13: 'breeding.toggle',
  14: 'ui.toggleCollection',
  15: 'camera.toggleMode',
}

const SPRINT_BUTTON = 10 // left stick click

/** Radial dead zone: inside it nothing, outside it rescaled so movement starts from zero. */
export function applyDeadzone(x: number, y: number, deadzone = DEADZONE): [number, number] {
  const mag = Math.hypot(x, y)
  if (!Number.isFinite(mag) || mag <= deadzone) return [0, 0]
  const scaled = Math.min(1, (mag - deadzone) / (1 - deadzone))
  return [(x / mag) * scaled, (y / mag) * scaled]
}

const axis = (axes: readonly number[], i: number): number => {
  const v = axes[i]
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0
}

export function mapPad(state: PadState, prev: PadState | null): PadOutput {
  const [moveX, moveYDown] = applyDeadzone(axis(state.axes, 0), axis(state.axes, 1))
  const [lookX, lookYDown] = applyDeadzone(axis(state.axes, 2), axis(state.axes, 3))

  const pressed: InputAction[] = []
  for (const [index, action] of Object.entries(BUTTON_ACTIONS)) {
    const i = Number(index)
    if (state.buttons[i] && !prev?.buttons[i]) pressed.push(action)
  }

  return {
    moveX,
    moveY: -moveYDown || 0, // stick up is negative on a pad; forward is positive here (never -0)
    lookX,
    lookY: -lookYDown || 0,
    sprint: Boolean(state.buttons[SPRINT_BUTTON]),
    pressed,
  }
}

/** Read the first connected pad into a `PadState`, or null if none is connected. */
export function readPad(pads: ArrayLike<Gamepad | null>): PadState | null {
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i]
    if (pad?.connected) {
      return {
        axes: [...pad.axes],
        buttons: pad.buttons.map((b) => b.pressed || b.value > 0.5),
      }
    }
  }
  return null
}
