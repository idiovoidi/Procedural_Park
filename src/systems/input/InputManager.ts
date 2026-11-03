/**
 * Centralized Input Manager
 * Handles all keyboard, mouse, and pointer input with priority system
 */

import type { InputAction, InputBinding, InputCallback, InputContext, InputState } from './types'

export class InputManager {
  private state: InputState
  private bindings: InputBinding[] = []
  private callbacks: Map<InputAction, Set<InputCallback>> = new Map()
  private canvas: HTMLCanvasElement | null = null
  private lastMousePosition = { x: 0, y: 0 }

  // Store bound event handlers for proper cleanup
  private boundHandlers = {
    keyDown: this.handleKeyDown.bind(this),
    keyUp: this.handleKeyUp.bind(this),
    mouseDown: this.handleMouseDown.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    mouseMove: this.handleMouseMove.bind(this),
    pointerLockChange: this.handlePointerLockChange.bind(this),
  }

  constructor() {
    this.state = {
      keysDown: new Set(),
      keysPressed: new Set(),
      keysReleased: new Set(),
      mouseDown: new Set(),
      mousePressed: new Set(),
      mouseReleased: new Set(),
      mousePosition: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      isPointerLocked: false,
      currentContext: 'game',
      isUIBlocking: false,
    }

    this.setupDefaultBindings()
    this.setupEventListeners()
  }

  private setupDefaultBindings() {
    // Camera controls
    this.addBinding({ action: 'camera.toggleMode', key: 'c', contexts: ['game'], priority: 1 })
    this.addBinding({ action: 'camera.moveForward', key: 'w', contexts: ['game'], priority: 1 })
    this.addBinding({ action: 'camera.moveBackward', key: 's', contexts: ['game'], priority: 1 })
    this.addBinding({ action: 'camera.moveLeft', key: 'a', contexts: ['game'], priority: 1 })
    this.addBinding({ action: 'camera.moveRight', key: 'd', contexts: ['game'], priority: 1 })
    this.addBinding({ action: 'camera.sprint', key: 'Shift', contexts: ['game'], priority: 1 })
    this.addBinding({ action: 'camera.jump', key: ' ', contexts: ['game'], priority: 1 })
    this.addBinding({
      action: 'camera.lookLeft',
      key: 'ArrowLeft',
      contexts: ['game'],
      priority: 1,
    })
    this.addBinding({
      action: 'camera.lookRight',
      key: 'ArrowRight',
      contexts: ['game'],
      priority: 1,
    })
    this.addBinding({ action: 'camera.lookUp', key: 'ArrowUp', contexts: ['game'], priority: 1 })
    this.addBinding({
      action: 'camera.lookDown',
      key: 'ArrowDown',
      contexts: ['game'],
      priority: 1,
    })

    // Game actions
    this.addBinding({ action: 'game.takePhoto', key: 't', contexts: ['game'], priority: 2 })
    this.addBinding({
      action: 'game.exportCreatureCard',
      key: 'e',
      contexts: ['game'],
      priority: 2,
    })
    this.addBinding({ action: 'game.restartRide', key: 'r', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'game.pause', key: 'p', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'game.speedUp', key: '+', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'game.speedUp', key: '=', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'game.speedDown', key: '-', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'game.speedDown', key: '_', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'game.randomizeCreature', key: 'x', contexts: ['game'], priority: 2 })

    // UI actions
    this.addBinding({ action: 'ui.toggleGallery', key: 'g', contexts: ['game', 'ui'], priority: 3 })
    this.addBinding({
      action: 'ui.toggleCollection',
      key: 'k',
      contexts: ['game', 'ui'],
      priority: 3,
    })
    this.addBinding({
      action: 'ui.toggleSettings',
      key: 'Escape',
      contexts: ['game', 'ui'],
      priority: 3,
    })
    this.addBinding({
      action: 'ui.toggleShortcuts',
      key: 'h',
      contexts: ['game', 'ui'],
      priority: 3,
    })
    this.addBinding({
      action: 'ui.toggleMultiplayer',
      key: 'm',
      contexts: ['game', 'ui'],
      priority: 3,
    })
    this.addBinding({
      action: 'ui.togglePlayerStats',
      key: 'i',
      contexts: ['game', 'ui'],
      priority: 3,
    })
    this.addBinding({ action: 'ui.toggleDayNight', key: 'n', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'ui.toggleMap', key: 'Tab', contexts: ['game', 'ui'], priority: 3 })

    // Shader actions
    this.addBinding({ action: 'shader.toggle', key: 'v', contexts: ['game'], priority: 2 })
    this.addBinding({
      action: 'shader.adjustThresholdDown',
      key: '[',
      contexts: ['game'],
      priority: 2,
    })
    this.addBinding({
      action: 'shader.adjustThresholdUp',
      key: ']',
      contexts: ['game'],
      priority: 2,
    })
    this.addBinding({
      action: 'shader.adjustIntensityDown',
      key: '{',
      contexts: ['game'],
      priority: 2,
    })
    this.addBinding({
      action: 'shader.adjustIntensityUp',
      key: '}',
      contexts: ['game'],
      priority: 2,
    })

    // Video actions
    this.addBinding({ action: 'video.toggleRecording', key: ';', contexts: ['game'], priority: 2 })

    // Food actions
    this.addBinding({ action: 'food.toggleInventory', key: 'b', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'food.feedCreature', key: 'f', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'food.toggleStore', key: 'o', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'market.toggle', key: 'u', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'build.toggle', key: 'j', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'capture.crate', key: 'y', contexts: ['game'], priority: 2 })
    this.addBinding({ action: 'capture.lure', key: 'l', contexts: ['game'], priority: 2 })
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.boundHandlers.keyDown)
    window.addEventListener('keyup', this.boundHandlers.keyUp)

    // Mouse events
    window.addEventListener('mousedown', this.boundHandlers.mouseDown)
    window.addEventListener('mouseup', this.boundHandlers.mouseUp)
    window.addEventListener('mousemove', this.boundHandlers.mouseMove)

    // Pointer lock events
    document.addEventListener('pointerlockchange', this.boundHandlers.pointerLockChange)
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Ignore if typing in input field
    if (this.isTypingInInput(event.target)) {
      return
    }

    const key = event.key
    // Normalize single letter keys to lowercase for consistent tracking
    const normalizedKey = key.length === 1 ? key.toLowerCase() : key

    // Track key state with normalized key
    if (!this.state.keysDown.has(normalizedKey)) {
      this.state.keysPressed.add(normalizedKey)
    }
    this.state.keysDown.add(normalizedKey)

    // Find matching binding (uses original key for matching)
    const binding = this.findBinding(key)
    if (binding) {
      event.preventDefault()
      this.triggerAction(binding.action)
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    const key = event.key
    // Normalize single letter keys to lowercase for consistent tracking
    const normalizedKey = key.length === 1 ? key.toLowerCase() : key

    this.state.keysDown.delete(normalizedKey)
    this.state.keysReleased.add(normalizedKey)
  }

  private handleMouseDown(event: MouseEvent) {
    const button = event.button

    if (!this.state.mouseDown.has(button)) {
      this.state.mousePressed.add(button)
    }
    this.state.mouseDown.add(button)

    // Find matching binding
    const binding = this.findBinding(undefined, button)
    if (binding) {
      event.preventDefault()
      this.triggerAction(binding.action)
    }
  }

  private handleMouseUp(event: MouseEvent) {
    const button = event.button

    this.state.mouseDown.delete(button)
    this.state.mouseReleased.add(button)
  }

  private handleMouseMove(event: MouseEvent) {
    // Update absolute position
    this.state.mousePosition.x = event.clientX
    this.state.mousePosition.y = event.clientY

    // Update delta
    if (this.state.isPointerLocked) {
      // Use movement for pointer lock
      this.state.mouseDelta.x = event.movementX || 0
      this.state.mouseDelta.y = event.movementY || 0
    } else {
      // Calculate delta from position change
      this.state.mouseDelta.x = event.clientX - this.lastMousePosition.x
      this.state.mouseDelta.y = event.clientY - this.lastMousePosition.y
    }

    this.lastMousePosition.x = event.clientX
    this.lastMousePosition.y = event.clientY
  }

  private handlePointerLockChange() {
    this.state.isPointerLocked = document.pointerLockElement !== null
  }

  private findBinding(key?: string, mouseButton?: number): InputBinding | null {
    // Find all matching bindings
    const matches = this.bindings.filter((binding) => {
      // Check if key or mouse button matches
      const inputMatches = key
        ? binding.key?.toLowerCase() === key.toLowerCase()
        : mouseButton !== undefined
          ? binding.mouseButton === mouseButton
          : false

      // Check if current context is allowed
      const contextMatches = binding.contexts.includes(this.state.currentContext)

      return inputMatches && contextMatches
    })

    // Return highest priority binding
    if (matches.length === 0) return null
    return matches.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    )
  }

  private triggerAction(action: InputAction) {
    const callbacks = this.callbacks.get(action)
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(action, this.state)
      })
    }
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!target) return false
    const element = target as HTMLElement
    return (
      element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable
    )
  }

  // Public API

  public addBinding(binding: InputBinding) {
    this.bindings.push(binding)
  }

  public removeBinding(action: InputAction) {
    this.bindings = this.bindings.filter((b) => b.action !== action)
  }

  public on(action: InputAction, callback: InputCallback) {
    if (!this.callbacks.has(action)) {
      this.callbacks.set(action, new Set())
    }
    const actionCallbacks = this.callbacks.get(action)
    if (actionCallbacks) {
      actionCallbacks.add(callback)
    }
  }

  public off(action: InputAction, callback: InputCallback) {
    const callbacks = this.callbacks.get(action)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  public setContext(context: InputContext) {
    this.state.currentContext = context
  }

  public setUIBlocking(blocking: boolean) {
    this.state.isUIBlocking = blocking
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  public requestPointerLock() {
    if (this.canvas) {
      this.canvas.requestPointerLock()
    }
  }

  public exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
  }

  // State queries

  public isKeyDown(key: string): boolean {
    return this.state.keysDown.has(key)
  }

  public isKeyPressed(key: string): boolean {
    return this.state.keysPressed.has(key)
  }

  public isKeyReleased(key: string): boolean {
    return this.state.keysReleased.has(key)
  }

  public isMouseDown(button: number): boolean {
    return this.state.mouseDown.has(button)
  }

  public isMousePressed(button: number): boolean {
    return this.state.mousePressed.has(button)
  }

  public isMouseReleased(button: number): boolean {
    return this.state.mouseReleased.has(button)
  }

  public getMousePosition(): { x: number; y: number } {
    return { ...this.state.mousePosition }
  }

  public getMouseDelta(): { x: number; y: number } {
    return { ...this.state.mouseDelta }
  }

  public isPointerLocked(): boolean {
    return this.state.isPointerLocked
  }

  // Update method - call once per frame to clear pressed/released states
  public update() {
    this.state.keysPressed.clear()
    this.state.keysReleased.clear()
    this.state.mousePressed.clear()
    this.state.mouseReleased.clear()

    // Clear mouse delta at end of frame (will be set by next mousemove event)
    // This ensures delta is only non-zero when mouse actually moved this frame
    this.state.mouseDelta.x = 0
    this.state.mouseDelta.y = 0
  }

  // Cleanup
  public dispose() {
    window.removeEventListener('keydown', this.boundHandlers.keyDown)
    window.removeEventListener('keyup', this.boundHandlers.keyUp)
    window.removeEventListener('mousedown', this.boundHandlers.mouseDown)
    window.removeEventListener('mouseup', this.boundHandlers.mouseUp)
    window.removeEventListener('mousemove', this.boundHandlers.mouseMove)
    document.removeEventListener('pointerlockchange', this.boundHandlers.pointerLockChange)

    this.callbacks.clear()
    this.bindings = []
  }
}
