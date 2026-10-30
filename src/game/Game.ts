import { log } from '@core/utils'
/**
 * Game
 * Main game class - now simplified and modular
 */

import { GAME_CONFIG } from '@core/constants'
import type { IntegratedStateManager } from '@systems/state'
import { showErrorScreen } from '@ui/utils/show-error-screen'
import { GameLoop } from './GameLoop'
import { InputHandler, type InputHandlerCallbacks } from './InputHandler'
import { FoodSystemManager, PhotoManager, SaveLoadManager } from './managers'
import { type GameSystems, SystemsCoordinator } from './SystemsCoordinator'

export class Game {
  private systems!: GameSystems
  private gameLoop!: GameLoop
  private photos!: PhotoManager
  private food!: FoodSystemManager
  private saveLoad!: SaveLoadManager
  private recordingIndicator: HTMLElement | null = null
  private container: HTMLElement
  private initPromise: Promise<void>

  constructor(container: HTMLElement) {
    this.container = container
    this.initPromise = this.initialize()

    // Always expose game instance for debugging
    ;(window as unknown as { game: Game }).game = this
    log.debug('🎮 AI Snap Game initialized')
    log.debug('Environment:', import.meta.env.DEV ? 'Development' : 'Production')
    log.debug('Game instance available as window.game')
  }

  /**
   * Initialize the game
   */
  private async initialize(): Promise<void> {
    const loadingEl = document.getElementById('loading')

    try {
      // Show loading screen
      loadingEl?.classList.remove('hidden')

      // Initialize all systems
      const coordinator = new SystemsCoordinator(this.container)
      this.systems = await coordinator.initialize()

      // Initialize game loop
      this.gameLoop = new GameLoop(this.systems)

      // Initialize feature managers
      this.photos = new PhotoManager(this.systems)
      this.food = new FoodSystemManager(this.systems)
      this.saveLoad = new SaveLoadManager(this.systems, this.photos, () => this.updateLabSign())

      // Setup input handler
      this.setupInputHandler()

      // Setup recording indicator
      this.setupRecordingIndicator()

      // Initialize state machine debug panel in development
      if (import.meta.env.DEV) {
        this.initializeStateDebugPanel()
      }

      // Spawn creatures
      this.systems.creatures.spawnCreatures()
      this.systems.creatures.spawnExperimentCreature()

      // Update lab sign with experiment creature name
      this.updateLabSign()

      // Start ambient sounds
      this.systems.audio.startAmbientSound('forest_ambient', 0.5)

      // Setup UI callbacks
      this.setupUICallbacks()

      // Initialize world state manager
      this.saveLoad.initialize()

      // Initialize food system
      this.food.initialize()

      // Hide loading screen and transition to playing state
      setTimeout(() => {
        loadingEl?.classList.add('hidden')
        this.systems.state.setFlowState('playing')
      }, GAME_CONFIG.LOADING_SCREEN_DELAY_MS)
    } catch (error) {
      console.error('❌ Game initialization failed:', error)
      showErrorScreen('Failed to initialize game systems.', error, 'Initialization Error')

      // Re-throw to propagate to start() method
      throw error
    }
  }

  /**
   * Setup UI callbacks
   */
  private setupUICallbacks(): void {
    const { ui, scene } = this.systems

    ui.onRideSpeedChange = (speed) => {
      this.systems.camera.setRideSpeed(speed)
    }

    ui.onClearGallery = () => {
      this.photos.clearGallery()
    }

    ui.onRestartRide = () => {
      this.restartRide()
    }

    ui.onDayNightToggle = (mode) => {
      scene.setDayNightMode(mode)
    }

    ui.onToggleMultiplayer = () => {
      this.systems.multiplayer.getMultiplayer().toggleUI()
    }
  }

  /**
   * Setup input handler with callbacks
   */
  private setupInputHandler(): void {
    const callbacks: InputHandlerCallbacks = {
      onTakePhoto: () => this.photos.takePhoto(),
      onExportCreatureCard: () => this.photos.exportCreatureCard(),
      onToggleCamera: () => this.toggleCamera(),
      onRestartRide: () => this.restartRide(),
      onTogglePause: () => this.togglePause(),
      onToggleRecording: () => this.toggleRecording(),
      onToggleShader: () => this.toggleShader(),
      onToggleCreatureInfo: () => {
        // TODO: Implement toggle creature info
      },
      onToggleGallery: () => this.systems.ui.toggleGallery(),
      onToggleCollection: () => this.systems.ui.toggleCollection(),
      onToggleMultiplayer: () => this.systems.ui.toggleMultiplayer(),
      onToggleSettings: () => this.systems.ui.toggleSettings(),
      onToggleShortcuts: () => this.systems.ui.toggleShortcuts(),
      onTogglePlayerStats: () => this.togglePlayerStats(),
      onToggleDebug: () => this.systems.debug.toggle(),
      onJump: () => this.systems.camera.jump(),
      onToggleFoodInventory: () => this.food.toggleInventory(),
      onFeedCreature: () => this.food.feedNearestCreature(),
      onRandomizeCreature: () => this.randomizeCreature(),
      onToggleFoodStore: () => this.food.toggleStore(),
    }

    new InputHandler(
      this.systems.input,
      this.systems.camera,
      this.systems.state,
      this.systems.ui,
      callbacks
    )
  }

  /**
   * Toggle camera mode
   */
  private toggleCamera(): void {
    this.systems.camera.toggleMode()
    const mode = this.systems.camera.getMode()
    this.systems.ui.showToast(mode === 'freeroam' ? '🎮 Free Roam Mode' : '🎢 Ride Mode')
  }

  /**
   * Restart ride
   */
  private restartRide(): void {
    // Respawn creatures
    this.systems.creatures.respawnCreatures()

    // Update lab sign
    this.updateLabSign()

    this.systems.camera.reset()
    this.systems.ui.showToast('🔄 Ride restarted')
  }

  /**
   * Randomize creatures
   */
  private randomizeCreature(): void {
    // Respawn creatures with new random seed
    this.systems.creatures.respawnCreatures()

    // Update lab sign
    this.updateLabSign()

    this.systems.ui.showToast('🎲 Creatures randomized')
  }

  /**
   * Toggle pause
   */
  private togglePause(): void {
    const currentState = this.systems.state.getFlowState()

    if (currentState === 'playing') {
      this.systems.state.setFlowState('paused')
      this.systems.ui.showToast('⏸ Paused')
    } else if (currentState === 'paused') {
      this.systems.state.setFlowState('playing')
      this.systems.ui.showToast('▶ Resumed')
    }
  }

  /**
   * Toggle recording
   */
  private toggleRecording(): void {
    const { video, ui } = this.systems

    if (video.isCurrentlyRecording()) {
      video.stopRecording()
      ui.showToast('⏹ Recording stopped')
    } else {
      video.startRecording()
      ui.showToast('⏺ Recording started (30s max)')
    }

    this.updateRecordingIndicator()
  }

  /**
   * Toggle shader
   */
  private toggleShader(): void {
    const enabled = this.systems.shaders.toggle()
    this.systems.ui.showToast(enabled ? '🎨 Shader ON' : '🎨 Shader OFF')
  }

  /**
   * Toggle player stats
   */
  private togglePlayerStats(): void {
    this.systems.ui.togglePlayerStats()

    // Update stats when opening
    const progress = this.saveLoad.getPlayerProgress()
    this.systems.ui.updatePlayerStats(progress)

    // Update inventory with sample items (photos as collectibles)
    const inventoryItems: import('@ui/components').InventoryItem[] = [
      {
        id: 'camera',
        name: 'Camera',
        icon: '📷',
        description: 'Your trusty camera for capturing wildlife',
        quantity: 1,
        rarity: 'legendary',
      },
      {
        id: 'photos',
        name: 'Photos',
        icon: '🖼️',
        description: 'Photos you have taken',
        quantity: progress.photoCount,
        rarity: 'common',
      },
    ]

    // Add food items to inventory
    const foodItems = this.systems.food.getInventory()
    foodItems.forEach((food) => {
      inventoryItems.push({
        id: food.id,
        name: food.name,
        icon: food.icon,
        description: food.description,
        quantity: food.quantity,
        rarity: food.rarity,
      })
    })

    // Add rarity-based collectibles
    if (progress.rarityTiers.legendary > 0) {
      inventoryItems.push({
        id: 'legendary_badge',
        name: 'Legendary',
        icon: '👑',
        description: 'Photographed a legendary creature',
        quantity: progress.rarityTiers.legendary,
        rarity: 'legendary',
      })
    }

    if (progress.rarityTiers.epic > 0) {
      inventoryItems.push({
        id: 'epic_badge',
        name: 'Epic',
        icon: '💎',
        description: 'Photographed an epic creature',
        quantity: progress.rarityTiers.epic,
        rarity: 'epic',
      })
    }

    if (progress.rarityTiers.rare > 0) {
      inventoryItems.push({
        id: 'rare_badge',
        name: 'Rare',
        icon: '💠',
        description: 'Photographed a rare creature',
        quantity: progress.rarityTiers.rare,
        rarity: 'rare',
      })
    }

    this.systems.ui.setInventory(inventoryItems)
  }

  /**
   * Setup recording indicator
   */
  private setupRecordingIndicator(): void {
    this.recordingIndicator = document.getElementById('recording-indicator')
  }

  /**
   * Update recording indicator
   */
  private updateRecordingIndicator(): void {
    if (!this.recordingIndicator) return

    if (this.systems.video.isCurrentlyRecording()) {
      this.recordingIndicator.classList.remove('hidden')
    } else {
      this.recordingIndicator.classList.add('hidden')
    }
  }

  /**
   * Update lab sign with experiment creature name
   */
  private updateLabSign(): void {
    const experimentCreature = this.systems.creatures.getExperimentCreature()
    if (experimentCreature) {
      const creatureName = this.systems.photo.generateCreatureName(experimentCreature)
      this.systems.scene.parkStructures.updateLabSign(creatureName)
    }
  }

  /**
   * Initialize state debug panel
   */
  private initializeStateDebugPanel(): void {
    const panel = document.createElement('div')
    panel.id = 'state-debug-panel'
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #4ade80;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      z-index: 10000;
      min-width: 220px;
      border: 1px solid rgba(74, 222, 128, 0.3);
    `
    document.body.appendChild(panel)

    // Update panel every 100ms
    setInterval(() => {
      const flowManager = this.systems.state.getFlowStateManager()
      const status = flowManager.getStatus()
      const config = flowManager.getCurrentConfig()

      panel.innerHTML = `
        <div style="margin-bottom: 8px; color: #60a5fa; font-weight: bold;">🎮 State Machine</div>
        <div><strong>State:</strong> ${status.current}</div>
        <div><strong>Previous:</strong> ${status.previous || 'none'}</div>
        <div><strong>Time:</strong> ${(status.timeInState / 1000).toFixed(1)}s</div>
        <div style="margin-top: 8px; color: #fbbf24;">Config:</div>
        <div style="margin-left: 10px; font-size: 10px;">
          <div>Loop: ${config.pauseGameLoop ? '⏸ Paused' : '▶ Running'}</div>
          <div>Audio: ${config.pauseAudio ? '🔇 Muted' : '🔊 Playing'}</div>
          <div>Camera: ${config.allowCameraMovement ? '✓' : '✗'}</div>
          <div>Photos: ${config.allowPhotoCapture ? '✓' : '✗'}</div>
        </div>
      `
    }, 100)
  }

  /**
   * Start the game
   */
  public async start(): Promise<void> {
    await this.initPromise
    this.gameLoop.start()
  }

  /**
   * Stop the game
   */
  public stop(): void {
    this.gameLoop.stop()
    this.systems.state.setFlowState('menu', true)
    this.systems.audio.stopAllAmbientSounds()
  }

  /**
   * Get state manager (for console debugging)
   */
  public getStateManager(): IntegratedStateManager {
    if (!this.systems) {
      throw new Error('Game not initialized yet. Call game.start() first.')
    }
    return this.systems.state
  }

  /**
   * Get debug info
   */
  public getDebugInfo() {
    return {
      state: this.systems.state.getDebugInfo(),
      creatures: {
        count: this.systems.creatures.getCreatures().length,
        hasExperiment: this.systems.creatures.getExperimentCreature() !== null,
      },
      multiplayer: {
        connected: this.systems.multiplayer.isConnected(),
      },
      camera: {
        mode: this.systems.camera.getMode(),
        position: this.systems.camera.camera.position,
      },
    }
  }
}
