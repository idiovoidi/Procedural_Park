/**
 * SystemsCoordinator
 * Initializes and coordinates all game systems
 */

import { SceneManager } from '@rendering/scene'
import { CameraController } from '@systems/camera'
import { UIManager } from '@ui/managers'
import { PhotoSystem } from '@systems/photo'
import { AudioManager } from '@systems/audio'
import { VideoRecorder } from '@game/VideoRecorder'
import { DebugPanel } from '@ui/debug'
import { InputManager } from '@systems/input'
import { IntegratedStateManager, createStateSyncHelpers, type GameStateType } from '@systems/state'
import { GAME_CONFIG } from '@core/constants'
import { CreatureManager, MultiplayerManager, ShaderService } from '@game/managers'
import { FoodManager } from '@systems/food'
import { CurrencyManager } from '@systems/currency'

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
  shaders: ShaderService
  food: FoodManager
  currency: CurrencyManager
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

    // Initialize shader service
    const shaderService = new ShaderService()

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

    // Connect shader service to scene manager
    shaderService.setShaderManager(sceneManager.getShaderManager())
    sceneManager.updateShaderConfig(shaderService.getConfig())

    // Reconnect shader service when shader manager is recreated (e.g., camera change)
    sceneManager.onShaderManagerRecreate((manager) => {
      shaderService.setShaderManager(manager)
    })

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

    // Initialize food manager
    const foodManager = new FoodManager()

    // Initialize currency manager
    const currencyManager = new CurrencyManager(GAME_CONFIG.STARTING_CURRENCY)

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
      shaders: shaderService,
      food: foodManager,
      currency: currencyManager,
    }

    // Setup system callbacks
    this.setupSystemCallbacks()

    return this.systems
  }

  /**
   * Setup callbacks between systems
   */
  private setupSystemCallbacks(): void {
    const { ui, photo, audio, shaders } = this.systems

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
    ui.onShaderConfigChange = (config) => shaders.updateConfig(config)
    ui.onShaderToggle = (enabled) => {
      if (enabled) {
        shaders.enable()
      } else {
        shaders.disable()
      }
    }
    ui.onShaderPresetLoad = (preset) => shaders.loadPreset(preset)
    ui.onAutoPerformanceToggle = (enabled) => {
      shaders.setAutoPerformanceAdjustment(enabled)
    }

    // Initialize shader debug UI
    ui.initializeShaderDebugUI(shaders.getConfig())
    ui.setShaderAutoPerformanceEnabled(false)

    // Setup shader config change callback to update UI
    shaders.onConfigChange((config) => {
      ui.updateShaderDebugUI(config)
    })

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
      const mpState = event.newState as import('@systems/state').MultiplayerState
      const prevState = event.previousState as import('@systems/state').MultiplayerState
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
