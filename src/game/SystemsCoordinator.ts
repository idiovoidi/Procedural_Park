/**
 * SystemsCoordinator
 * Initializes and coordinates all game systems
 */

import { SceneManager } from '../scene'
import { CameraController } from '../camera'
import { UIManager } from '../ui'
import { PhotoSystem } from '../photo-system'
import { AudioManager } from '../audio'
import { VideoRecorder } from '../video-recorder'
import { DebugPanel } from '../debug'
import { InputManager } from '../input-manager'
import { IntegratedStateManager } from '../state-integration'
import { createStateSyncHelpers } from '../state-sync-helpers'
import { GAME_CONFIG } from '../constants'
import { INSCRYPTION_SHADER_DEFAULTS } from '../shaders/InscryptionShaderConfig'
import type { ShaderConfig } from '../shaders/ShaderManager'
import type { GameStateType } from '../state-machine'
import { CreatureManager } from './CreatureManager'
import { MultiplayerManager } from './MultiplayerManager'

export interface GameSystems {
  scene: SceneManager
  camera: CameraController
  ui: UIManager
  photo: PhotoSystem
  audio: AudioManager
  video: VideoRecorder
  debug: DebugPanel
  input: InputManager
  state: IntegratedStateManager
  syncHelpers: ReturnType<typeof createStateSyncHelpers>
  creatures: CreatureManager
  multiplayer: MultiplayerManager
  shaderConfig: ShaderConfig
}

export class SystemsCoordinator {
  private systems!: GameSystems
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Initialize all game systems
   */
  public async initialize(): Promise<GameSystems> {
    // Initialize state manager first
    const stateManager = new IntegratedStateManager()

    // Preload shader resources
    this.preloadShaderResources()

    // Initialize shader configuration
    const shaderConfig = { ...INSCRYPTION_SHADER_DEFAULTS }

    // Initialize input manager
    const inputManager = new InputManager()

    // Initialize core systems
    const sceneManager = new SceneManager(this.container)
    const cameraController = new CameraController(sceneManager.curve, inputManager)
    const uiManager = new UIManager()
    const photoSystem = new PhotoSystem()
    const audioManager = new AudioManager(cameraController.camera)
    const videoRecorder = new VideoRecorder(sceneManager.getCanvas())
    const debugPanel = new DebugPanel()

    // Setup camera mouse controls
    cameraController.setupMouseControls(sceneManager.getCanvas())

    // Apply shader configuration
    sceneManager.updateShaderConfig(shaderConfig)

    // Initialize sync helpers
    const syncHelpers = createStateSyncHelpers(
      stateManager.getSubsystemStateManager(),
      cameraController,
      uiManager
    )

    // Setup auto-sync for camera
    syncHelpers.camera?.setupAutoSync(100)

    // Initialize creature manager
    const creatureManager = new CreatureManager(
      sceneManager.scene,
      sceneManager.curve,
      audioManager,
      cameraController,
      uiManager,
      stateManager,
      sceneManager.parkStructures
    )

    // Initialize multiplayer manager
    const multiplayerManager = new MultiplayerManager(
      sceneManager.scene,
      stateManager,
      syncHelpers,
      uiManager,
      audioManager,
      cameraController
    )

    // Store all systems
    this.systems = {
      scene: sceneManager,
      camera: cameraController,
      ui: uiManager,
      photo: photoSystem,
      audio: audioManager,
      video: videoRecorder,
      debug: debugPanel,
      input: inputManager,
      state: stateManager,
      syncHelpers,
      creatures: creatureManager,
      multiplayer: multiplayerManager,
      shaderConfig,
    }

    // Setup system callbacks
    this.setupSystemCallbacks()

    return this.systems
  }

  /**
   * Setup callbacks between systems
   */
  private setupSystemCallbacks(): void {
    const { ui, photo, audio, scene, state, shaderConfig } = this.systems

    // Photo system callbacks
    photo.setCallbacks({
      onShutter: () => audio.playSoundEffect('camera_shutter'),
      onScore: (score) => {
        if (score >= GAME_CONFIG.PHOTO_SCORE_EXCELLENT) {
          audio.playSoundEffect('photo_score', GAME_CONFIG.AUDIO_PHOTO_SCORE)
        }
      },
    })

    // UI audio callbacks
    ui.setAudioCallbacks({
      onClick: () => audio.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK),
      onHover: () => audio.playSoundEffect('ui_hover', GAME_CONFIG.AUDIO_UI_HOVER),
    })

    // UI game callbacks (these will be set by Game class)
    // onRideSpeedChange, onClearGallery, onRestartRide, onDayNightToggle, onToggleMultiplayer

    // UI shader callbacks
    ui.onShaderConfigChange = (config) => scene.updateShaderConfig(config)
    ui.onShaderToggle = (enabled) => {
      shaderConfig.enabled = enabled
      scene.updateShaderConfig(shaderConfig)
    }
    ui.onShaderPresetLoad = (preset) => scene.updateShaderConfig(preset)
    ui.onAutoPerformanceToggle = (enabled) => {
      // TODO: Implement auto-performance adjustment
    }

    // Initialize shader debug UI
    ui.initializeShaderDebugUI(shaderConfig)
    ui.setShaderAutoPerformanceEnabled(false)

    // Setup state change handlers
    this.setupStateHandlers()
  }

  /**
   * Setup state change handlers
   */
  private setupStateHandlers(): void {
    const { state, audio } = this.systems

    // Listen for flow state changes
    state.onFlowStateChange((newState, prevState) => {
      console.log(`Game state: ${prevState} → ${newState}`)
      this.handleStateChange(newState, prevState)
    })

    // Listen for subsystem state changes
    state.onSubsystemChange('ui', (event) => {
      // UI updates handled by sync helpers
    })

    state.onSubsystemChange('multiplayer', (event) => {
      const mpState = event.newState as import('../subsystem-states').MultiplayerState
      const prevState = event.previousState as import('../subsystem-states').MultiplayerState
      if (mpState.isConnected && !prevState.isConnected) {
        console.log('Multiplayer connected')
      } else if (!mpState.isConnected && prevState.isConnected) {
        console.log('Multiplayer disconnected')
      }
    })
  }

  /**
   * Handle flow state changes
   */
  private handleStateChange(newState: GameStateType, prevState: GameStateType | null): void {
    const { state, audio } = this.systems
    const config = state.getFlowStateManager().getCurrentConfig()

    if (config.pauseAudio) {
      audio.setAmbientVolume(0)
    } else {
      audio.setAmbientVolume(1)
    }
  }

  /**
   * Preload shader resources
   */
  private preloadShaderResources(): void {
    // Shader resources are loaded dynamically, no preload needed
  }

  /**
   * Get all systems
   */
  public getSystems(): GameSystems {
    return this.systems
  }
}
