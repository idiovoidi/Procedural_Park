/**
 * Event Bus - Centralized pub/sub system for decoupled communication
 *
 * Usage:
 *   EventBus.on('photoTaken', (data) => console.log(data))
 *   EventBus.emit('photoTaken', { score: 85, creature: 'Deer' })
 *   EventBus.off('photoTaken', handler)
 */

// Event type definitions
export interface GameEvents {
  // Photo system
  photoTaken: { score: number; creature: string; dataUrl: string }
  photoScoreCalculated: { score: number; distance: number; framing: number; rarity: number }

  // Camera
  cameraModeSwitched: { mode: 'ride' | 'free' }
  cameraSpeedChanged: { speed: number }

  // Creatures
  creatureSpawned: { id: string; type: string; position: { x: number; y: number; z: number } }
  creatureNearby: { id: string; name: string; distance: number }
  creatureBehaviorChanged: { id: string; behavior: string }

  // UI
  uiPanelToggled: { panel: string; visible: boolean }
  settingChanged: { key: string; value: unknown }

  // Game state
  gameStarted: undefined
  gamePaused: undefined
  gameResumed: undefined
  rideRestarted: undefined

  // Multiplayer
  peerConnected: { peerId: string }
  peerDisconnected: { peerId: string }
  peerStateReceived: { peerId: string; state: unknown }

  // Visual effects
  shaderEnabled: { shader: string; enabled: boolean }
  effectIntensityChanged: { effect: string; intensity: number }

  // Environment
  timeOfDayChanged: { mode: 'day' | 'night' }
  biomeEntered: { biome: string; position: { x: number; z: number } }

  // Performance
  fpsChanged: { fps: number }
  performanceWarning: { message: string; severity: 'low' | 'medium' | 'high' }

  // Audio
  audioPlayed: { type: string; volume: number }
  audioVolumeChanged: { category: string; volume: number }
}

type EventHandler<T> = (data: T) => void
type EventMap = { [K in keyof GameEvents]: EventHandler<GameEvents[K]>[] }

class EventBusClass {
  private events: Partial<EventMap> = {}
  // biome-ignore lint/complexity/noBannedTypes: Event handlers have varying signatures
  private onceHandlers: Map<string, Set<Function>> = new Map()
  private debugMode = false

  /**
   * Subscribe to an event
   */
  on<K extends keyof GameEvents>(event: K, handler: EventHandler<GameEvents[K]>): void {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event]!.push(handler)

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to '${String(event)}'`)
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<K extends keyof GameEvents>(event: K, handler: EventHandler<GameEvents[K]>): void {
    const wrappedHandler = (data: GameEvents[K]) => {
      handler(data)
      this.off(event, wrappedHandler as EventHandler<GameEvents[K]>)
    }

    // Track for cleanup
    if (!this.onceHandlers.has(String(event))) {
      this.onceHandlers.set(String(event), new Set())
    }
    const handlers = this.onceHandlers.get(String(event))
    if (handlers) {
      handlers.add(handler)
    }

    this.on(event, wrappedHandler as EventHandler<GameEvents[K]>)
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof GameEvents>(event: K, handler: EventHandler<GameEvents[K]>): void {
    const handlers = this.events[event]
    if (!handlers) return

    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)

      if (this.debugMode) {
        console.log(`[EventBus] Unsubscribed from '${String(event)}'`)
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const handlers = this.events[event]
    if (!handlers || handlers.length === 0) {
      if (this.debugMode) {
        console.log(`[EventBus] No handlers for '${String(event)}'`)
      }
      return
    }

    if (this.debugMode) {
      console.log(`[EventBus] Emitting '${String(event)}'`, data)
    }

    // Call handlers in order, catching errors to prevent one handler from breaking others
    handlers.forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        console.error(`[EventBus] Error in handler for '${String(event)}':`, error)
      }
    })
  }

  /**
   * Remove all handlers for a specific event
   */
  clear<K extends keyof GameEvents>(event: K): void {
    delete this.events[event]
    this.onceHandlers.delete(String(event))

    if (this.debugMode) {
      console.log(`[EventBus] Cleared all handlers for '${String(event)}'`)
    }
  }

  /**
   * Remove all event handlers
   */
  clearAll(): void {
    this.events = {}
    this.onceHandlers.clear()

    if (this.debugMode) {
      console.log('[EventBus] Cleared all handlers')
    }
  }

  /**
   * Get count of handlers for an event
   */
  getHandlerCount<K extends keyof GameEvents>(event: K): number {
    return this.events[event]?.length ?? 0
  }

  /**
   * Get all registered event names
   */
  getRegisteredEvents(): string[] {
    return Object.keys(this.events)
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Get debug info about current state
   */
  getDebugInfo(): { event: string; handlerCount: number }[] {
    return Object.keys(this.events).map((event) => ({
      event,
      handlerCount: this.events[event as keyof GameEvents]?.length ?? 0,
    }))
  }
}

// Export singleton instance
export const EventBus = new EventBusClass()

// Export class for testing purposes
export { EventBusClass }
