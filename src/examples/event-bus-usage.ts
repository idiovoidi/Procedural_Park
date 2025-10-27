/**
 * Event Bus Usage Examples
 * 
 * This file demonstrates how to integrate the EventBus into existing systems
 */

import { EventBus } from '@game/EventBus'

// ============================================================================
// Example 1: Photo System Integration
// ============================================================================

export class PhotoSystemExample {
  constructor() {
    // Subscribe to photo events
    EventBus.on('photoTaken', this.handlePhotoTaken.bind(this))
    EventBus.on('photoScoreCalculated', this.handleScoreCalculated.bind(this))
  }

  takePhoto(creature: string, distance: number): void {
    // Calculate score
    const score = this.calculateScore(distance)
    
    // Emit events instead of direct callbacks
    EventBus.emit('photoScoreCalculated', {
      score,
      distance,
      framing: 0.8,
      rarity: 0.5,
    })

    EventBus.emit('photoTaken', {
      score,
      creature,
      dataUrl: 'data:image/png;base64,...',
    })
  }

  private calculateScore(distance: number): number {
    return Math.max(0, 100 - distance * 2)
  }

  private handlePhotoTaken(data: { score: number; creature: string; dataUrl: string }): void {
    console.log(`Photo taken! Score: ${data.score}, Creature: ${data.creature}`)
  }

  private handleScoreCalculated(data: { score: number; distance: number }): void {
    console.log(`Score calculated: ${data.score} (distance: ${data.distance})`)
  }

  cleanup(): void {
    EventBus.off('photoTaken', this.handlePhotoTaken.bind(this))
    EventBus.off('photoScoreCalculated', this.handleScoreCalculated.bind(this))
  }
}

// ============================================================================
// Example 2: Audio System Integration
// ============================================================================

export class AudioSystemExample {
  constructor() {
    // Listen to various game events and play appropriate sounds
    EventBus.on('photoTaken', this.playShutterSound.bind(this))
    EventBus.on('uiPanelToggled', this.playUISound.bind(this))
    EventBus.on('creatureNearby', this.playCreatureSound.bind(this))
  }

  private playShutterSound(data: { score: number }): void {
    const volume = data.score > 80 ? 1.0 : 0.8
    console.log(`Playing shutter sound at volume ${volume}`)
    
    EventBus.emit('audioPlayed', { type: 'shutter', volume })
  }

  private playUISound(): void {
    console.log('Playing UI click sound')
    EventBus.emit('audioPlayed', { type: 'ui_click', volume: 0.5 })
  }

  private playCreatureSound(data: { distance: number }): void {
    const volume = Math.max(0.1, 1 - data.distance / 25)
    console.log(`Playing creature sound at volume ${volume}`)
    EventBus.emit('audioPlayed', { type: 'creature', volume })
  }
}

// ============================================================================
// Example 3: UI System Integration
// ============================================================================

export class UISystemExample {
  private galleryVisible = false

  constructor() {
    // Listen to photo events to update gallery
    EventBus.on('photoTaken', this.addPhotoToGallery.bind(this))
    
    // Listen to settings changes
    EventBus.on('settingChanged', this.handleSettingChanged.bind(this))
  }

  toggleGallery(): void {
    this.galleryVisible = !this.galleryVisible
    
    // Notify other systems
    EventBus.emit('uiPanelToggled', {
      panel: 'gallery',
      visible: this.galleryVisible,
    })
  }

  private addPhotoToGallery(data: { score: number; creature: string; dataUrl: string }): void {
    console.log(`Adding photo to gallery: ${data.creature} (${data.score})`)
    // Update DOM...
  }

  private handleSettingChanged(data: { key: string; value: any }): void {
    console.log(`Setting changed: ${data.key} = ${data.value}`)
    // Update UI...
  }
}

// ============================================================================
// Example 4: Multiplayer Integration
// ============================================================================

export class MultiplayerSystemExample {
  constructor() {
    // Listen to game events to sync with peers
    EventBus.on('photoTaken', this.syncPhotoWithPeers.bind(this))
    EventBus.on('cameraModeSwitched', this.syncCameraMode.bind(this))
    
    // Listen to peer events
    EventBus.on('peerConnected', this.handlePeerConnected.bind(this))
    EventBus.on('peerDisconnected', this.handlePeerDisconnected.bind(this))
  }

  private syncPhotoWithPeers(data: { score: number; creature: string }): void {
    console.log(`Syncing photo with peers: ${data.creature}`)
    // Send to peers...
  }

  private syncCameraMode(data: { mode: 'ride' | 'free' }): void {
    console.log(`Syncing camera mode: ${data.mode}`)
    // Send to peers...
  }

  private handlePeerConnected(data: { peerId: string }): void {
    console.log(`Peer connected: ${data.peerId}`)
    // Update UI, send initial state...
  }

  private handlePeerDisconnected(data: { peerId: string }): void {
    console.log(`Peer disconnected: ${data.peerId}`)
    // Clean up peer avatar...
  }
}

// ============================================================================
// Example 5: Performance Monitoring
// ============================================================================

export class PerformanceMonitorExample {
  private fpsHistory: number[] = []

  constructor() {
    EventBus.on('fpsChanged', this.trackFPS.bind(this))
  }

  updateFPS(fps: number): void {
    EventBus.emit('fpsChanged', { fps })

    // Check for performance issues
    if (fps < 30) {
      EventBus.emit('performanceWarning', {
        message: 'Low FPS detected',
        severity: 'high',
      })
    }
  }

  private trackFPS(data: { fps: number }): void {
    this.fpsHistory.push(data.fps)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift()
    }
  }
}

// ============================================================================
// Example 6: One-time Event Handlers
// ============================================================================

export class GameInitializationExample {
  constructor() {
    // Use 'once' for initialization events
    EventBus.once('gameStarted', () => {
      console.log('Game started! This handler will only run once.')
      this.loadInitialData()
    })
  }

  private loadInitialData(): void {
    console.log('Loading initial game data...')
  }

  startGame(): void {
    EventBus.emit('gameStarted', undefined)
  }
}

// ============================================================================
// Example 7: Debug Mode
// ============================================================================

export function enableEventBusDebug(): void {
  EventBus.setDebugMode(true)
  
  // Log all events
  console.log('Registered events:', EventBus.getRegisteredEvents())
  console.log('Debug info:', EventBus.getDebugInfo())
}

// ============================================================================
// Example 8: Cleanup Pattern
// ============================================================================

export class SystemWithCleanup {
  private handlers = {
    photoTaken: this.handlePhotoTaken.bind(this),
    gameStarted: this.handleGameStarted.bind(this),
  }

  constructor() {
    // Register handlers
    EventBus.on('photoTaken', this.handlers.photoTaken)
    EventBus.on('gameStarted', this.handlers.gameStarted)
  }

  private handlePhotoTaken(data: { score: number }): void {
    console.log('Photo taken:', data.score)
  }

  private handleGameStarted(): void {
    console.log('Game started')
  }

  // Clean up when system is destroyed
  dispose(): void {
    EventBus.off('photoTaken', this.handlers.photoTaken)
    EventBus.off('gameStarted', this.handlers.gameStarted)
  }
}
