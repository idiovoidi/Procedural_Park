/**
 * Input System Types
 */

export type InputAction =
  // Camera actions
  | 'camera.toggleMode'
  | 'camera.moveForward'
  | 'camera.moveBackward'
  | 'camera.moveLeft'
  | 'camera.moveRight'
  | 'camera.sprint'
  | 'camera.jump'
  | 'camera.lookLeft'
  | 'camera.lookRight'
  | 'camera.lookUp'
  | 'camera.lookDown'
  // Game actions
  | 'game.takePhoto'
  | 'game.exportCreatureCard'
  | 'game.restartRide'
  | 'game.pause'
  | 'game.speedUp'
  | 'game.speedDown'
  | 'game.randomizeCreature'
  // UI actions
  | 'ui.toggleGallery'
  | 'ui.toggleCollection'
  | 'ui.toggleSettings'
  | 'ui.toggleShortcuts'
  | 'ui.toggleMultiplayer'
  | 'ui.togglePlayerStats'
  | 'ui.toggleDayNight'
  // Shader actions
  | 'shader.toggle'
  | 'shader.adjustThresholdUp'
  | 'shader.adjustThresholdDown'
  | 'shader.adjustIntensityUp'
  | 'shader.adjustIntensityDown'
  // Video actions
  | 'video.toggleRecording'

export type InputContext = 'game' | 'ui' | 'menu'

export interface InputBinding {
  action: InputAction
  key?: string
  mouseButton?: number
  contexts: InputContext[]
  priority: number
}

export interface InputState {
  // Keyboard
  keysDown: Set<string>
  keysPressed: Set<string>
  keysReleased: Set<string>

  // Mouse
  mouseDown: Set<number>
  mousePressed: Set<number>
  mouseReleased: Set<number>
  mousePosition: { x: number; y: number }
  mouseDelta: { x: number; y: number }

  // Pointer lock
  isPointerLocked: boolean

  // Context
  currentContext: InputContext

  // UI blocking
  isUIBlocking: boolean
}

export type InputCallback = (action: InputAction, state: InputState) => void
