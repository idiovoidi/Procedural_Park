import { SceneManager } from './scene'
import { CameraController } from './camera'
import { UIManager } from './ui'
import { PhotoSystem } from './photo-system'
import { AudioManager } from './audio'
import { VideoRecorder } from './video-recorder'
import { DebugPanel } from './debug'
import {
  createRng,
  spawnCreatureNearPath,
  spawnCreatureAt,
  type CreatureInstance,
} from './creatures'
import { GAME_CONFIG } from './constants'
import { type ShaderConfig } from './shaders/ShaderManager'
import { INSCRYPTION_SHADER_DEFAULTS } from './shaders/InscryptionShaderConfig'
import { WebRTCMultiplayer } from './multiplayer/WebRTCMultiplayer'
import { DEFAULT_CONFIG, type GameState, type GameEvent } from './multiplayer/types'
import { InputManager } from './input-manager'
import { IntegratedStateManager } from './state-integration'
import { createStateSyncHelpers } from './state-sync-helpers'
import type { GameStateType } from './state-machine'

export class Game {
  private sceneManager: SceneManager
  private cameraController: CameraController
  private uiManager: UIManager
  private photoSystem: PhotoSystem
  private audioManager: AudioManager
  private videoRecorder: VideoRecorder
  private debugPanel: DebugPanel
  private inputManager: InputManager
  private stateManager: IntegratedStateManager
  private syncHelpers: ReturnType<typeof createStateSyncHelpers> | null = null
  private multiplayer: WebRTCMultiplayer | null = null
  private creatures: CreatureInstance[] = []
  private experimentCreature: CreatureInstance | null = null
  private lastTime = 0
  private recordingIndicator: HTMLElement | null = null
  private shaderConfig: ShaderConfig

  constructor(container: HTMLElement) {
    // Initialize state manager first (starts in 'loading' state)
    this.stateManager = new IntegratedStateManager()
    this.setupStateHandlers()

    // Show loading screen
    const loadingEl = document.getElementById('loading')
    loadingEl?.classList.remove('hidden')

    // Preload shader resources for better performance
    this.preloadShaderResources()

    // Initialize shader configuration with Inscryption-style defaults
    this.shaderConfig = { ...INSCRYPTION_SHADER_DEFAULTS }

    // Initialize input manager
    this.inputManager = new InputManager()

    // Initialize all systems
    this.sceneManager = new SceneManager(container)
    this.cameraController = new CameraController(this.sceneManager.curve, this.inputManager)
    this.uiManager = new UIManager()
    this.photoSystem = new PhotoSystem()
    this.audioManager = new AudioManager(this.cameraController.camera)

    // Apply initial shader configuration with callbacks
    this.setupShaderCallbacks()
    this.sceneManager.updateShaderConfig(this.shaderConfig)

    // Setup UI callbacks
    this.uiManager.onRideSpeedChange = (speed) => this.setRideSpeed(speed)
    this.uiManager.onClearGallery = () => this.clearGallery()
    this.uiManager.onRestartRide = () => this.restartRide()
    this.uiManager.onDayNightToggle = (mode) => this.sceneManager.setDayNightMode(mode)
    this.uiManager.onToggleMultiplayer = () => this.toggleMultiplayerUI()

    // Setup shader debug UI callbacks
    this.uiManager.onShaderConfigChange = (config) => this.updateShaderConfig(config)
    this.uiManager.onShaderToggle = (enabled) => this.setShaderEnabled(enabled)
    this.uiManager.onShaderPresetLoad = (preset) => this.updateShaderConfig(preset)
    this.uiManager.onAutoPerformanceToggle = (enabled) =>
      this.setShaderAutoPerformanceAdjustment(enabled)

    // Initialize shader debug UI
    this.uiManager.initializeShaderDebugUI(this.shaderConfig)

    // Disable auto-performance adjustment for testing
    this.setShaderAutoPerformanceAdjustment(false)
    this.uiManager.setShaderAutoPerformanceEnabled(false)

    // Setup photo system callbacks
    this.photoSystem.setCallbacks({
      onShutter: () => this.audioManager.playSoundEffect('camera_shutter'),
      onScore: (score) => {
        if (score >= GAME_CONFIG.PHOTO_SCORE_EXCELLENT) {
          this.audioManager.playSoundEffect('photo_score', GAME_CONFIG.AUDIO_PHOTO_SCORE)
        }
      },
    })

    // Setup UI audio callbacks
    this.uiManager.setAudioCallbacks({
      onClick: () => this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK),
      onHover: () => this.audioManager.playSoundEffect('ui_hover', GAME_CONFIG.AUDIO_UI_HOVER),
    })

    // Setup mouse controls
    this.cameraController.setupMouseControls(this.sceneManager.getCanvas())

    // Initialize video recorder
    this.videoRecorder = new VideoRecorder(this.sceneManager.getCanvas())
    this.setupRecordingIndicator()

    // Initialize debug panel
    this.debugPanel = new DebugPanel()

    // Initialize state machine debug panel in development
    if (import.meta.env.DEV) {
      this.initializeStateDebugPanel()
    }

    // Initialize multiplayer system
    this.multiplayer = new WebRTCMultiplayer(this.sceneManager.scene, DEFAULT_CONFIG)
    this.setupMultiplayerCallbacks()

    // Generate creatures
    this.spawnCreatures()

    // Create experiment creature in lab
    this.spawnExperimentCreature()

    // Setup input handlers via input manager
    this.setupInputHandlers()

    // Start ambient sounds
    this.startAmbientAudio()

    // Initialize sync helpers after all systems are created
    this.initializeSyncHelpers()

    // Hide loading screen and transition to playing state
    setTimeout(() => {
      loadingEl?.classList.add('hidden')
      this.stateManager.setFlowState('playing')
    }, GAME_CONFIG.LOADING_SCREEN_DELAY_MS)
  }

  private initializeSyncHelpers(): void {
    this.syncHelpers = createStateSyncHelpers(
      this.stateManager.getSubsystemStateManager(),
      this.cameraController,
      this.uiManager
    )

    // Setup auto-sync for camera (every 100ms)
    this.syncHelpers.camera?.setupAutoSync(100)
  }

  private setupStateHandlers(): void {
    // Listen for flow state changes
    this.stateManager.onFlowStateChange((newState, prevState) => {
      console.log(`Game state: ${prevState} → ${newState}`)
      this.handleStateChange(newState, prevState)
    })

    // Listen for subsystem state changes
    this.setupSubsystemStateHandlers()
  }

  private setupSubsystemStateHandlers(): void {
    // Handle UI state changes
    this.stateManager.onSubsystemChange('ui', (event) => {
      // UI updates will be handled by sync helpers
    })

    // Handle multiplayer state changes
    this.stateManager.onSubsystemChange('multiplayer', (event) => {
      const state = event.newState as import('./subsystem-states').MultiplayerState
      const prevState = event.previousState as import('./subsystem-states').MultiplayerState
      if (state.isConnected && !prevState.isConnected) {
        console.log('Multiplayer connected')
      } else if (!state.isConnected && prevState.isConnected) {
        console.log('Multiplayer disconnected')
      }
    })
  }

  private handleStateChange(newState: GameStateType, prevState: GameStateType | null): void {
    // Handle audio based on state
    const config = this.stateManager.getFlowStateManager().getCurrentConfig()
    if (config.pauseAudio) {
      // Mute ambient sounds but keep them running
      this.audioManager.setAmbientVolume(0)
    } else {
      // Restore ambient sounds
      this.audioManager.setAmbientVolume(1)
    }
  }

  private initializeStateDebugPanel(): void {
    // Create a simple debug panel for state machine
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
      const flowManager = this.stateManager.getFlowStateManager()
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
        <div style="margin-top: 8px; color: #a78bfa; font-size: 10px;">
          Transitions: ${status.historyCount}
        </div>
      `
    }, 100)
  }

  private setupMultiplayerCallbacks() {
    if (!this.multiplayer) return

    this.multiplayer.onConnected = () => {
      console.log('Connected to peer!')
      this.uiManager.showToast('🌐 Connected to friend!')
      this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
      
      // Update multiplayer state
      this.stateManager.updateMultiplayerState({
        isConnected: true,
        connectionStatus: 'connected',
      })
    }

    this.multiplayer.onDisconnected = () => {
      console.log('Disconnected from peer')
      this.uiManager.showToast('🌐 Disconnected from friend')
      this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
      
      // Update multiplayer state
      this.stateManager.updateMultiplayerState({
        isConnected: false,
        connectionStatus: 'disconnected',
        peerId: null,
        peerPosition: null,
        peerRotation: null,
      })
    }

    this.multiplayer.onPeerStateUpdate = (state: GameState) => {
      // Update peer position in state
      this.stateManager.updateMultiplayerState({
        peerPosition: state.position,
        peerRotation: { yaw: state.rotation.y, pitch: state.rotation.x },
        lastSyncTime: state.timestamp,
      })
    }

    this.multiplayer.onGameEvent = (event: GameEvent) => {
      if (event.type === 'photo') {
        this.uiManager.showToast('📸 Friend took a photo!')
        this.audioManager.playSoundEffect('camera_shutter', GAME_CONFIG.AUDIO_PHOTO_SCORE)
      }
    }

    this.multiplayer.onError = (error: Error) => {
      console.error('Multiplayer error:', error)
      this.uiManager.showToast(`❌ Multiplayer error: ${error.message}`)
      
      // Update multiplayer state
      this.stateManager.updateMultiplayerState({
        connectionStatus: 'error',
      })
    }
  }

  private syncStateToMultiplayer() {
    if (!this.syncHelpers || !this.multiplayer) return

    // Create lightweight sync packet
    const packet = this.syncHelpers.multiplayer.createSyncPacket()
    
    // Convert to old format for compatibility
    const cameraPos = packet.camera.position
    const cameraRot = packet.camera.rotation
    const cameraMode = this.cameraController.getMode()
    
    const state: GameState = {
      position: cameraPos,
      rotation: { x: cameraRot.pitch, y: cameraRot.yaw, z: 0 },
      cameraMode: cameraMode === 'freeroam' ? 'free' : 'ride',
      rideProgress: this.cameraController.getRideProgress(),
      timestamp: packet.timestamp,
    }
    
    this.multiplayer.sendGameState(state)
  }

  private spawnCreatures() {
    const randWorld = createRng(GAME_CONFIG.WORLD_SEED)
    this.creatures = Array.from({ length: GAME_CONFIG.CREATURE_COUNT }, () =>
      spawnCreatureNearPath(this.sceneManager.scene, this.sceneManager.curve, randWorld)
    )
  }

  private spawnExperimentCreature() {
    const labPosition = this.sceneManager.parkStructures.getLabPosition()
    const rand = createRng(Math.random() * 100000)

    this.experimentCreature = spawnCreatureAt(this.sceneManager.scene, labPosition, rand)

    // Update lab sign with creature name
    const creatureName = this.photoSystem.generateCreatureName(this.experimentCreature)
    this.sceneManager.parkStructures.updateLabSign(creatureName)
  }

  private randomizeExperimentCreature() {
    if (!this.experimentCreature) return

    // Remove old creature
    this.sceneManager.scene.remove(this.experimentCreature.group)

    // Create new one with random seed
    const labPosition = this.sceneManager.parkStructures.getLabPosition()
    const rand = createRng(Math.random() * 100000)

    this.experimentCreature = spawnCreatureAt(this.sceneManager.scene, labPosition, rand)

    // Update lab sign with new creature name
    const creatureName = this.photoSystem.generateCreatureName(this.experimentCreature)
    this.sceneManager.parkStructures.updateLabSign(creatureName)

    this.uiManager.showToast('🧬 Creature Randomized!')
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private setupInputHandlers() {
    // Camera actions
    this.inputManager.on('camera.toggleMode', () => this.toggleCameraMode())
    this.inputManager.on('camera.jump', () => this.jump())
    
    // Game actions
    this.inputManager.on('game.takePhoto', () => this.takePhoto())
    this.inputManager.on('game.restartRide', () => this.restartRide())
    this.inputManager.on('game.pause', () => this.togglePause())
    this.inputManager.on('game.speedUp', () => this.increaseSpeed())
    this.inputManager.on('game.speedDown', () => this.decreaseSpeed())
    this.inputManager.on('game.randomizeCreature', () => this.randomizeExperimentCreature())
    
    // UI actions
    this.inputManager.on('ui.toggleGallery', () => this.uiManager.toggleGallery())
    this.inputManager.on('ui.toggleSettings', () => this.uiManager.toggleSettings())
    this.inputManager.on('ui.toggleShortcuts', () => this.uiManager.toggleShortcuts())
    this.inputManager.on('ui.toggleMultiplayer', () => this.toggleMultiplayerUI())
    this.inputManager.on('ui.toggleDayNight', () => {
      const btn = document.getElementById('dayNightToggle') as HTMLButtonElement
      if (btn) btn.click()
    })
    
    // Shader actions
    this.inputManager.on('shader.toggle', () => this.toggleShader())
    this.inputManager.on('shader.adjustThresholdDown', () => this.adjustShaderParameter('luminanceThreshold', -0.05))
    this.inputManager.on('shader.adjustThresholdUp', () => this.adjustShaderParameter('luminanceThreshold', 0.05))
    this.inputManager.on('shader.adjustIntensityDown', () => this.adjustShaderParameter('intensity', -0.1))
    this.inputManager.on('shader.adjustIntensityUp', () => this.adjustShaderParameter('intensity', 0.1))
    
    // Video actions
    this.inputManager.on('video.toggleRecording', () => this.toggleVideoRecording())
  }

  private jump() {
    this.cameraController.jump()
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private toggleCameraMode() {
    const newMode = this.cameraController.toggleMode()
    const modeText = newMode === 'ride' ? '🎢 Ride Mode' : '🚶 Free Roam Mode'
    this.uiManager.showToast(modeText)
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private increaseSpeed() {
    const currentSpeed = this.cameraController.getRideSpeed()
    const newSpeed = Math.min(currentSpeed * 1.5, GAME_CONFIG.CAMERA_SPEED_FAST * 2)
    this.cameraController.setRideSpeed(newSpeed)
    this.uiManager.showToast(
      `Speed: ${((newSpeed / GAME_CONFIG.CAMERA_SPEED_DEFAULT) * 100).toFixed(0)}%`
    )
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private decreaseSpeed() {
    const currentSpeed = this.cameraController.getRideSpeed()
    const newSpeed = Math.max(currentSpeed / 1.5, GAME_CONFIG.CAMERA_SPEED_VERY_SLOW / 2)
    this.cameraController.setRideSpeed(newSpeed)
    this.uiManager.showToast(
      `Speed: ${((newSpeed / GAME_CONFIG.CAMERA_SPEED_DEFAULT) * 100).toFixed(0)}%`
    )
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private togglePause() {
    const currentState = this.stateManager.getFlowState()
    
    if (currentState === 'playing') {
      this.stateManager.setFlowState('paused')
      this.uiManager.showToast('⏸ Paused')
    } else if (currentState === 'paused') {
      this.stateManager.setFlowState('playing')
      this.uiManager.showToast('▶ Resumed')
    }
    
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private async toggleVideoRecording() {
    if (this.videoRecorder.isCurrentlyRecording()) {
      // Stop recording
      this.videoRecorder.stopRecording()
      this.hideRecordingIndicator()
      this.uiManager.showToast('🎬 Video saved!')
      this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
    } else {
      // Start recording
      const success = await this.videoRecorder.startRecording()
      if (success) {
        this.showRecordingIndicator()
        this.uiManager.showToast('🎬 Recording started (30s max)')
        this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
      } else {
        this.uiManager.showToast('❌ Recording failed - check browser support')
      }
    }
  }

  private setupRecordingIndicator() {
    // Create recording indicator element
    const indicator = document.createElement('div')
    indicator.id = 'recording-indicator'
    indicator.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-weight: bold;
      display: none;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      animation: pulse 1.5s ease-in-out infinite;
    `
    indicator.innerHTML = '🔴 REC <span id="recording-time">0:00</span>'
    document.body.appendChild(indicator)
    this.recordingIndicator = indicator

    // Add pulse animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `
    document.head.appendChild(style)
  }

  private showRecordingIndicator() {
    if (this.recordingIndicator) {
      this.recordingIndicator.style.display = 'flex'
    }
  }

  private hideRecordingIndicator() {
    if (this.recordingIndicator) {
      this.recordingIndicator.style.display = 'none'
    }
  }

  private updateRecordingIndicator() {
    if (this.videoRecorder.isCurrentlyRecording() && this.recordingIndicator) {
      const duration = this.videoRecorder.getRecordingDuration()
      const seconds = Math.floor(duration / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      const timeElement = this.recordingIndicator.querySelector('#recording-time')
      if (timeElement) {
        timeElement.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      }
    }
  }

  private takePhoto() {
    // Check if photos are allowed in current state
    if (!this.stateManager.isPhotoAllowed()) {
      this.uiManager.showToast('Cannot take photos right now')
      return
    }

    // Include experiment creature in photo system
    const allCreatures = this.experimentCreature
      ? [...this.creatures, this.experimentCreature]
      : this.creatures

    const result = this.photoSystem.takePhoto(
      allCreatures,
      this.cameraController.camera,
      this.sceneManager.scene
    )

    // Capture the photo
    const dataUrl = this.sceneManager.capturePhoto()

    // Add to gallery
    this.uiManager.addPhotoToGallery(dataUrl, result.score, result.creatureName)

    // Show score feedback
    this.uiManager.showScoreToast(result.score)

    // Update UI state
    const currentUI = this.stateManager.getUIState()
    this.stateManager.updateUIState({
      photoCount: currentUI.photoCount + 1,
      totalScore: currentUI.totalScore + result.score,
      lastScore: result.score,
    })

    // Log detailed score breakdown for debugging
    if (result.creature) {
      const breakdown = this.photoSystem.getScoreBreakdown(
        result.creature,
        this.cameraController.camera
      )
      console.log(`Photo of ${result.creatureName}:`, breakdown)
    }

    // Send photo event to peer if connected
    if (this.multiplayer && this.multiplayer.isConnected()) {
      this.multiplayer.sendEvent({
        type: 'photo',
        timestamp: performance.now(),
      })
    }
  }

  private restartRide() {
    // Reset camera position
    this.cameraController = new CameraController(this.sceneManager.curve, this.inputManager)
    this.cameraController.setupMouseControls(this.sceneManager.getCanvas())

    // Respawn creatures in new positions
    this.clearCreatures()
    this.spawnCreatures()

    this.uiManager.showToast('Ride restarted!')
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private clearCreatures() {
    for (const creature of this.creatures) {
      this.sceneManager.scene.remove(creature.group)
    }
    this.creatures = []

    // Don't clear experiment creature on restart
  }

  private updateCreatures(dtSeconds: number) {
    for (const creature of this.creatures) {
      const oldBehavior = creature.behaviorState

      // Update environment interactions
      this.sceneManager.environmentInteractions.updateCreatureBehavior(creature, dtSeconds)

      creature.update(
        dtSeconds,
        performance.now() / 1000,
        this.cameraController.camera,
        this.creatures
      )

      // Play creature sounds based on behavior changes
      if (oldBehavior !== creature.behaviorState) {
        this.playCreatureBehaviorSound(creature)
      }
    }

    // Update experiment creature
    if (this.experimentCreature) {
      this.experimentCreature.update(
        dtSeconds,
        performance.now() / 1000,
        this.cameraController.camera,
        []
      )
    }

    // Find closest creature in view for info display
    this.updateCreatureInfo()
  }

  private playCreatureBehaviorSound(creature: any) {
    const position = creature.group.position
    const distance = this.cameraController.camera.position.distanceTo(position)

    // Only play sounds for creatures within reasonable distance
    if (distance > GAME_CONFIG.MAX_CREATURE_DISTANCE) return

    const volume =
      Math.max(GAME_CONFIG.AUDIO_CREATURE_MIN, 1 - distance / GAME_CONFIG.MAX_CREATURE_DISTANCE) *
      GAME_CONFIG.AUDIO_CREATURE_BASE

    switch (creature.behaviorState) {
      case 'curious':
        if (creature.anatomy.archetype === 'aerial') {
          this.audioManager.playSoundEffect('creature_chirp', volume, position)
        }
        break
      case 'territorial':
        if (creature.anatomy.temperament === 'aggressive') {
          this.audioManager.playSoundEffect('creature_growl', volume, position)
        }
        break
      case 'playing':
        if (creature.anatomy.archetype === 'aerial' && creature.anatomy.wingCount > 0) {
          this.audioManager.playSoundEffect('creature_flutter', volume, position)
        }
        break
      case 'shy':
        if (creature.anatomy.archetype === 'aquatic') {
          this.audioManager.playSoundEffect('creature_splash', volume * 0.6, position)
        }
        break
    }
  }

  private updateCreatureInfo() {
    let closestCreature: CreatureInstance | null = null
    let closestDistance = Infinity

    // Check regular creatures
    for (const creature of this.creatures) {
      const distance = this.cameraController.camera.position.distanceTo(creature.group.position)

      // Check if creature is in view (simplified check)
      if (distance < GAME_CONFIG.CREATURE_INFO_DISTANCE) {
        if (distance < closestDistance) {
          closestDistance = distance
          closestCreature = creature
        }
      }
    }

    // Check experiment creature
    if (this.experimentCreature) {
      const distance = this.cameraController.camera.position.distanceTo(
        this.experimentCreature.group.position
      )
      if (distance < GAME_CONFIG.CREATURE_INFO_DISTANCE && distance < closestDistance) {
        closestDistance = distance
        closestCreature = this.experimentCreature
      }
    }

    if (closestCreature) {
      const creatureName = this.photoSystem.generateCreatureName(closestCreature)
      const isExperiment = closestCreature === this.experimentCreature
      this.uiManager.showCreatureInfo(
        isExperiment ? `🧬 ${creatureName} (EXPERIMENT)` : creatureName,
        closestDistance,
        closestCreature.rarity
      )
    } else {
      this.uiManager.hideCreatureInfo()
    }
  }

  private updateMiniMap() {
    const cameraPos = this.cameraController.camera.position
    const playerPosition = { x: cameraPos.x, z: cameraPos.z }

    // Get path points from the curve
    const pathPoints = []
    for (let t = 0; t <= 1; t += GAME_CONFIG.MINIMAP_PATH_STEP) {
      pathPoints.push(this.sceneManager.curve.getPoint(t))
    }

    // Create biome data for mini-map
    const biomes = new Map<string, string>()

    // Sample biomes at regular intervals for mini-map display
    const { min, max } = GAME_CONFIG.MINIMAP_BIOME_SAMPLE_RANGE
    const step = GAME_CONFIG.MINIMAP_BIOME_SAMPLE_STEP
    for (let x = min; x <= max; x += step) {
      for (let z = min; z <= max; z += step) {
        const biome = this.sceneManager.terrainSystem.getBiomeAt(x, z)
        biomes.set(`${x},${z}`, biome)
      }
    }

    this.uiManager.updateMiniMap(playerPosition, pathPoints, biomes)
  }

  private gameLoop = (now = performance.now()) => {
    const dtMs = Math.min(GAME_CONFIG.MAX_FRAME_TIME_MS, now - this.lastTime)
    this.lastTime = now
    const dt = dtMs / 1000

    // Always update state machine
    this.stateManager.update(dt)

    // Conditionally update game systems based on state
    if (!this.stateManager.shouldPauseGameLoop()) {
      // Update camera only if movement is allowed
      if (this.stateManager.isCameraMovementAllowed()) {
        this.cameraController.update(dt)
      }
      
      this.updateCreatures(dt)
      this.updateMiniMap()
      this.sceneManager.update(now / 1000) // Update park animations
    }

    // Always update recording indicator
    this.updateRecordingIndicator()

    // Update multiplayer (even when paused for connection state)
    if (this.multiplayer && this.multiplayer.isConnected()) {
      this.multiplayer.update(dt)

      // Sync state to multiplayer using new system
      this.syncStateToMultiplayer()
    }

    // Update sprint indicator
    if (this.cameraController.isSprint()) {
      this.uiManager.showSprintIndicator()
    } else {
      this.uiManager.hideSprintIndicator()
    }

    // Update debug panel
    this.debugPanel.update(dt, this.sceneManager.renderer, this.cameraController.camera, {
      creatures: this.creatures.length,
      cameraMode: this.cameraController.getMode(),
      rideProgress: this.cameraController.getRideProgress(),
    })

    // Always render (for pause menu, etc.)
    this.sceneManager.render(this.cameraController.camera, dt)

    // Update input manager at END of frame (clears pressed/released states)
    this.inputManager.update()

    requestAnimationFrame(this.gameLoop)
  }

  public start() {
    // Start game loop (state is already set to 'playing' after loading)
    this.lastTime = performance.now()
    this.gameLoop()
  }

  public stop() {
    // Transition to menu state
    this.stateManager.setFlowState('menu', true)
    this.audioManager.stopAllAmbientSounds()

    // Clean up multiplayer resources
    if (this.multiplayer) {
      this.multiplayer.dispose()
    }
    
    // Clean up input manager
    this.inputManager.dispose()
  }

  private startAmbientAudio() {
    // Start forest ambient sounds
    this.audioManager.startAmbientSound('forest_ambient', GAME_CONFIG.AUDIO_FOREST_AMBIENT)
    this.audioManager.startAmbientSound('wind_gentle', GAME_CONFIG.AUDIO_WIND_GENTLE)
    this.audioManager.startAmbientSound('birds_distant', GAME_CONFIG.AUDIO_BIRDS_DISTANT)

    // Enable audio context on first user interaction
    const enableAudio = () => {
      this.audioManager.resumeAudioContext()
      document.removeEventListener('click', enableAudio)
      document.removeEventListener('keydown', enableAudio)
    }
    document.addEventListener('click', enableAudio)
    document.addEventListener('keydown', enableAudio)
  }

  public getStats() {
    return {
      photoCount: this.uiManager.getPhotoCount(),
      totalScore: this.uiManager.getTotalScore(),
      creatureCount: this.creatures.length,
      rideProgress: this.cameraController.getRideProgress(),
      gameState: this.stateManager.getFlowState(),
    }
  }

  public getStateManager(): IntegratedStateManager {
    return this.stateManager
  }

  private setRideSpeed(speed: number) {
    this.cameraController.setRideSpeed(speed)
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  public clearGallery() {
    this.uiManager.clearGallery()
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private toggleMultiplayerUI() {
    if (!this.multiplayer) return
    this.multiplayer.toggleUI()
  }

  // Setup shader system callbacks
  private setupShaderCallbacks(): void {
    // Note: Shader callbacks are now handled internally by ShaderManager
    // UI notifications can be added through other means if needed
  }

  // Shader control methods
  private toggleShader() {
    this.shaderConfig.enabled = !this.shaderConfig.enabled
    this.sceneManager.setShaderEnabled(this.shaderConfig.enabled)

    const statusText = this.shaderConfig.enabled
      ? '🎨 Inscryption Shader ON'
      : '🎨 Inscryption Shader OFF'
    this.uiManager.showToast(statusText)
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  private adjustShaderParameter(parameter: keyof ShaderConfig, delta: number) {
    if (parameter === 'enabled') return

    const currentValue = this.shaderConfig[parameter] as number
    let newValue = currentValue + delta

    // Clamp values to valid ranges
    switch (parameter) {
      case 'luminanceThreshold':
        newValue = Math.max(0.0, Math.min(1.0, newValue))
        break
      case 'colorSteps':
        newValue = Math.max(2, Math.min(16, Math.floor(newValue)))
        break
      case 'intensity':
        newValue = Math.max(0.0, Math.min(2.0, newValue))
        break
      case 'darknessBias':
        newValue = Math.max(0.0, Math.min(1.0, newValue))
        break
    }

    this.shaderConfig[parameter] = newValue
    this.sceneManager.updateShaderConfig({ [parameter]: newValue })
    this.uiManager.updateShaderDebugUI(this.shaderConfig)

    this.uiManager.showToast(`${parameter}: ${newValue.toFixed(2)}`)
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  public updateShaderConfig(config: Partial<ShaderConfig>): void {
    this.shaderConfig = { ...this.shaderConfig, ...config }
    this.sceneManager.updateShaderConfig(config)
    this.uiManager.updateShaderDebugUI(this.shaderConfig)
  }

  public getShaderConfig(): ShaderConfig {
    return { ...this.shaderConfig }
  }

  public setShaderEnabled(enabled: boolean): void {
    this.shaderConfig.enabled = enabled
    this.sceneManager.setShaderEnabled(enabled)
    this.uiManager.updateShaderDebugUI(this.shaderConfig)
  }

  public setShaderAutoPerformanceAdjustment(enabled: boolean): void {
    this.sceneManager.setShaderAutoPerformanceAdjustment(enabled)
    console.log(`Shader auto-performance adjustment ${enabled ? 'enabled' : 'disabled'}`)
  }

  public isShaderAutoPerformanceAdjustmentEnabled(): boolean {
    return this.sceneManager.isShaderAutoPerformanceAdjustmentEnabled()
  }

  // Preload shader resources for better performance
  private preloadShaderResources(): void {
    // Shader resource preloading removed for compatibility
  }

  // Get production optimization status
  public getShaderOptimizationStatus(): {
    isOptimized: boolean
    compatibility: any
  } {
    return {
      isOptimized: false, // Simplified for now
      compatibility: null, // Simplified for now
    }
  }
}
