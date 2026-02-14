/**
 * Game
 * Main game class - now simplified and modular
 */

import { SystemsCoordinator, type GameSystems } from './SystemsCoordinator'
import { GameLoop } from './GameLoop'
import { InputHandler, type InputHandlerCallbacks } from './InputHandler'
import { GAME_CONFIG } from '@core/constants'
import { showErrorScreen } from '@ui/utils/show-error-screen'
import type { IntegratedStateManager } from '@systems/state'
import {
  WorldStateManager,
  createWorldStateSnapshot,
  type PlayerProgress,
  type SerializedPhoto,
  type WorldState,
} from '@systems/state'

export class Game {
  private systems!: GameSystems
  private gameLoop!: GameLoop
  private inputHandler!: InputHandler
  private worldStateManager!: WorldStateManager
  private recordingIndicator: HTMLElement | null = null
  private container: HTMLElement
  private initPromise: Promise<void>
  private galleryPhotos: SerializedPhoto[] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.initPromise = this.initialize()

    // Always expose game instance for debugging
    ;(window as any).game = this
    console.log('🎮 AI Snap Game initialized')
    console.log('Environment:', import.meta.env.DEV ? 'Development' : 'Production')
    console.log('Game instance available as window.game')
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
      this.initializeWorldState()

      // Initialize food system
      this.initializeFoodSystem()

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
      // TODO: Implement ride speed change
    }

    ui.onClearGallery = () => {
      ui.clearGallery()
      this.galleryPhotos = []
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
      onTakePhoto: () => this.takePhoto(),
      onExportCreatureCard: () => this.exportCreatureCard(),
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
      onToggleFoodInventory: () => this.toggleFoodInventory(),
      onFeedCreature: () => this.feedCreature(),
      onRandomizeCreature: () => this.randomizeCreature(),
      onToggleFoodStore: () => this.toggleFoodStore(),
    }

    this.inputHandler = new InputHandler(
      this.systems.input,
      this.systems.camera,
      this.systems.state,
      this.systems.ui,
      this.systems.video,
      this.systems.scene,
      callbacks
    )
  }

  /**
   * Take a photo
   */
  private takePhoto(): void {
    const { state, photo, scene, ui, creatures, multiplayer, currency } = this.systems

    // Check if photos are allowed
    if (!state.isPhotoAllowed()) {
      ui.showToast('Cannot take photos right now')
      return
    }

    // Take photo
    const result = photo.takePhoto(
      creatures.getAllCreatures(),
      this.systems.camera.camera,
      scene.scene
    )

    // Capture the photo
    const dataUrl = scene.capturePhoto()

    // Add to gallery
    ui.addPhotoToGallery(dataUrl, result.score, result.creatureName)

    // Store photo for saving
    this.galleryPhotos.push({
      dataUrl,
      score: result.score,
      creatureName: result.creatureName,
      timestamp: Date.now(),
    })

    // Calculate and award currency
    import('@systems/currency/currency-rewards').then(({ calculatePhotoReward }) => {
      const reward = calculatePhotoReward(result.score)
      currency.addMoney(reward, `Photo of ${result.creatureName} (${result.score} pts)`)
      ui.showToast(`+${reward} 🪙`)
    })

    // Show score feedback
    ui.showScoreToast(result.score)

    // Update UI state and track discoveries
    const currentUI = state.getUIState()
    const newPhotoCount = currentUI.photoCount + 1
    const newTotalScore = currentUI.totalScore + result.score
    const newBestScore = Math.max(currentUI.lastScore, result.score)
    
    state.updateUIState({
      photoCount: newPhotoCount,
      totalScore: newTotalScore,
      lastScore: result.score,
    })

    // Log detailed score breakdown
    if (result.creature) {
      const breakdown = photo.getScoreBreakdown(result.creature, this.systems.camera.camera)
      console.log(`Photo of ${result.creatureName}:`, breakdown)
    }

    // Send photo event to peer
    multiplayer.sendPhotoEvent()
  }

  /**
   * Export creature card
   */
  private async exportCreatureCard(): Promise<void> {
    console.log('🎯 exportCreatureCard called')
    const { photo, scene, ui, creatures } = this.systems

    try {
      console.log('📸 Calling photo.exportCreatureCard...')
      const result = await photo.exportCreatureCard(
        creatures.getAllCreatures(),
        this.systems.camera.camera,
        scene.scene,
        GAME_CONFIG.WORLD_SEED
      )

      console.log('📦 Export result:', result ? 'Success' : 'No creature found')

      if (result) {
        console.log('➕ Adding to collection:', result.metadata.creatureName)
        const added = ui.addCreatureToCollection(result.metadata, result.thumbnail)
        console.log('Collection add result:', added ? 'Added' : 'Already exists')
        
        if (added) {
          ui.showToast(`📦 Captured ${result.metadata.creatureName}!`)
        } else {
          ui.showToast(`Already have ${result.metadata.creatureName}`)
        }
      } else {
        console.warn('⚠️ No creature in view')
        ui.showToast('❌ No creature in view')
      }
    } catch (error) {
      console.error('❌ Failed to capture creature:', error)
      ui.showToast('❌ Capture failed')
    }
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

    // Reset camera (create new instance)
    // TODO: Add reset method to CameraController instead
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

    if ((video as any).isRecording) {
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
    const progress = this.getPlayerProgress()
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

    if ((this.systems.video as any).isRecording) {
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

  /**
   * Initialize food system
   */
  private initializeFoodSystem(): void {
    const { ui, food, currency } = this.systems

    // Update UI with initial inventory
    ui.updateFoodInventory(food.getInventory())

    // Setup food selection callback
    ui.setOnFoodSelect((foodId) => {
      if (foodId) {
        food.selectFood(foodId)
        ui.showToast(`Selected ${food.getSelectedFood()?.name}`)
      } else {
        food.deselectFood()
        ui.showToast('Food deselected')
      }
    })

    // Initialize currency display
    ui.updateCurrency(currency.getBalance())

    // Setup currency balance change callback
    currency.onBalanceChange((balance) => {
      ui.updateCurrency(balance)
      ui.getFoodStore().updateBalance(balance)
    })

    // Setup store
    this.initializeStore()
  }

  /**
   * Initialize store system
   */
  private initializeStore(): void {
    const { ui, food, currency } = this.systems

    // Load store items
    import('@systems/food/store-data').then(({ STORE_ITEMS }) => {
      ui.getFoodStore().loadItems(STORE_ITEMS)
      ui.getFoodStore().updateBalance(currency.getBalance())
    })

    // Setup purchase callback
    ui.getFoodStore().setOnPurchase((itemId, price) => {
      const result = currency.purchase(price, itemId)

      if (result.success) {
        food.addFood(itemId, 1)
        ui.showToast(result.message)
        ui.updateFoodInventory(food.getInventory())
        return true
      } else {
        ui.showToast(result.message)
        return false
      }
    })
  }

  /**
   * Toggle food inventory
   */
  private toggleFoodInventory(): void {
    this.systems.ui.toggleFoodInventory()
    this.systems.ui.updateFoodInventory(this.systems.food.getInventory())
  }

  /**
   * Toggle food store
   */
  private toggleFoodStore(): void {
    this.systems.ui.toggleFoodStore()
  }

  /**
   * Feed nearest creature
   */
  private feedCreature(): void {
    const { food, creatures, camera, photo, ui, currency } = this.systems

    const selectedFood = food.getSelectedFood()
    if (!selectedFood) {
      ui.showToast('❌ No food selected! Press B to open food inventory')
      return
    }

    if (selectedFood.quantity === 0) {
      ui.showToast('❌ Out of ' + selectedFood.name)
      return
    }

    // Find nearest creature
    const allCreatures = creatures.getAllCreatures()
    let nearestCreature = null
    let nearestDistance = Infinity

    for (const creature of allCreatures) {
      const distance = camera.camera.position.distanceTo(creature.group.position)
      if (distance < nearestDistance && distance < GAME_CONFIG.FEED_CREATURE_RANGE_M) {
        nearestDistance = distance
        nearestCreature = creature
      }
    }

    if (!nearestCreature) {
      ui.showToast(`❌ No creature nearby (get within ${GAME_CONFIG.FEED_CREATURE_RANGE_M}m)`)
      return
    }

    // Check cooldown
    if (!food.canFeedCreature(nearestCreature)) {
      const cooldown = food.getFeedingCooldown(nearestCreature)
      ui.showToast(`⏳ Wait ${cooldown}s before feeding again`)
      return
    }

    // Feed the creature
    const result = food.feedCreature(nearestCreature, camera.camera, (c) =>
      photo.generateCreatureName(c)
    )

    if (result) {
      // Show feedback based on reaction
      const reactionEmojis = {
        loved: '😍',
        liked: '😊',
        neutral: '😐',
        disliked: '😕',
      }

      const emoji = reactionEmojis[result.creatureReaction]
      const message = `${emoji} ${result.creatureName} ${result.creatureReaction} the ${result.foodUsed.name}!`

      if (result.bonusApplied) {
        ui.showToast(`${message} (Posing!)`)
      } else {
        ui.showToast(message)
      }

      // Award currency for feeding
      import('@systems/currency/currency-rewards').then(({ CURRENCY_REWARDS }) => {
        let reward = CURRENCY_REWARDS.FEED_CREATURE
        if (result.creatureReaction === 'loved') {
          reward += CURRENCY_REWARDS.CREATURE_LOVED_FOOD
        }
        currency.addMoney(reward, `Fed ${result.creatureName}`)
        ui.showToast(`+${reward} 🪙`)
      })

      // Update inventory UI
      ui.updateFoodInventory(food.getInventory())
      ui.setSelectedFood(food.getSelectedFood()?.id || null)

      // Play sound effect
      if (result.creatureReaction === 'loved' || result.creatureReaction === 'liked') {
        // TODO: Add feeding sound effect
      }
    }
  }

  /**
   * Initialize world state manager and save/load system
   */
  private initializeWorldState(): void {
    // Create world state manager
    this.worldStateManager = new WorldStateManager()
    this.worldStateManager.setAutoSaveEnabled(true)
    this.worldStateManager.setAutoSaveInterval(GAME_CONFIG.AUTO_SAVE_INTERVAL_MS)

    // Setup save/load menu
    const saveLoadMenu = this.systems.ui.getSaveLoadMenu()
    saveLoadMenu.setWorldStateManager(this.worldStateManager)
    saveLoadMenu.setCallbacks({
      onSave: (slotId) => this.handleSave(slotId),
      onLoad: (slotId) => this.handleLoad(slotId),
      onDelete: (slotId) => {
        this.systems.ui.showToast('🗑️ Save deleted')
      },
      onExport: (slotId) => this.handleExport(slotId),
      onImport: (slotId, data) => this.handleImport(slotId, data),
    })

    // Setup keyboard shortcuts
    this.setupSaveLoadShortcuts()
  }

  /**
   * Setup save/load keyboard shortcuts
   */
  private setupSaveLoadShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // F5 - Quick Save
      if (e.key === 'F5') {
        e.preventDefault()
        this.handleSave('quicksave')
      }

      // F9 - Quick Load
      if (e.key === 'F9') {
        e.preventDefault()
        this.handleLoad('quicksave')
      }
    })
  }

  /**
   * Handle save to slot
   */
  private handleSave(slotId: string): void {
    try {
      const snapshot = createWorldStateSnapshot({
        worldSeed: GAME_CONFIG.WORLD_SEED,
        progress: this.getPlayerProgress(),
        camera: this.systems.camera.camera,
        cameraMode: this.systems.camera.getMode(),
        photos: this.galleryPhotos,
        settings: {
          dayNightMode: 'day', // TODO: Get from scene
          audioEnabled: true,
          ambientVolume: 0.5,
          shaderEnabled: this.systems.shaders.isEnabled(),
          showCreatureInfo: true,
        },
      })

      const success = this.worldStateManager.createSave(slotId, snapshot)

      if (success) {
        const displayName = slotId === 'quicksave' ? 'Quick Save' : `Slot ${slotId.replace('slot_', '')}`
        this.systems.ui.showToast(`💾 ${displayName} saved!`)
      } else {
        this.systems.ui.showToast('❌ Save failed!')
      }
    } catch (error) {
      console.error('Save error:', error)
      this.systems.ui.showToast('❌ Save error!')
    }
  }

  /**
   * Handle load from slot
   */
  private handleLoad(slotId: string): void {
    try {
      const state = this.worldStateManager.loadSave(slotId)

      if (!state) {
        this.systems.ui.showToast('❌ No save found!')
        return
      }

      this.restoreGameState(state)

      const displayName = slotId === 'quicksave' ? 'Quick Save' : `Slot ${slotId.replace('slot_', '')}`
      this.systems.ui.showToast(`📂 ${displayName} loaded!`)
    } catch (error) {
      console.error('Load error:', error)
      this.systems.ui.showToast('❌ Load error!')
    }
  }

  /**
   * Handle export save
   */
  private handleExport(slotId: string): void {
    try {
      const jsonData = this.worldStateManager.exportSave(slotId)
      if (!jsonData) {
        this.systems.ui.showToast('❌ Export failed!')
        return
      }

      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aisnap_save_${slotId}_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      this.systems.ui.showToast('📤 Save exported!')
    } catch (error) {
      console.error('Export error:', error)
      this.systems.ui.showToast('❌ Export error!')
    }
  }

  /**
   * Handle import save
   */
  private handleImport(slotId: string, data: string): void {
    try {
      const success = this.worldStateManager.importSave(slotId, data)
      if (success) {
        this.systems.ui.showToast('📥 Save imported!')
      } else {
        this.systems.ui.showToast('❌ Import failed!')
      }
    } catch (error) {
      console.error('Import error:', error)
      this.systems.ui.showToast('❌ Import error!')
    }
  }

  /**
   * Get current player progress
   */
  private getPlayerProgress(): PlayerProgress {
    const uiState = this.systems.state.getUIState()
    return {
      photoCount: uiState.photoCount,
      totalScore: uiState.totalScore,
      bestScore: uiState.lastScore,
      creaturesDiscovered: new Set(),
      rarityTiers: {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
      },
      playTime: this.worldStateManager.getSessionPlayTime(),
      lastPlayed: Date.now(),
    }
  }

  /**
   * Restore game state from loaded data
   */
  private restoreGameState(state: WorldState): void {
    // Restore camera
    this.systems.camera.camera.position.set(
      state.camera.position.x,
      state.camera.position.y,
      state.camera.position.z
    )
    this.systems.camera.camera.rotation.set(
      state.camera.rotation.x,
      state.camera.rotation.y,
      state.camera.rotation.z
    )

    // Restore progress
    this.systems.state.updateUIState({
      photoCount: state.progress.photoCount,
      totalScore: state.progress.totalScore,
      lastScore: state.progress.bestScore,
    })

    // Restore gallery photos
    this.galleryPhotos = state.photos
    this.systems.ui.clearGallery()
    state.photos.forEach((photo) => {
      this.systems.ui.addPhotoToGallery(photo.dataUrl, photo.score, photo.creatureName)
    })

    // Respawn creatures (they regenerate from seed)
    this.systems.creatures.respawnCreatures()
    this.updateLabSign()

    // Reset play time tracker
    this.worldStateManager.resetPlayTimeTracker()
  }
}
