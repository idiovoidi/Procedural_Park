import { log } from '@core/utils'
/**
 * SystemsCoordinator
 * Initializes and coordinates all game systems
 */

import { GAME_CONFIG } from '@core/constants'
import {
  BuildModeManager,
  CreatureManager,
  MultiplayerManager,
  ShaderService,
} from '@game/managers'
import { VideoRecorder } from '@game/VideoRecorder'
import { SceneManager } from '@rendering/scene'
import type { ShaderConfig } from '@rendering/shaders'
import { AudioManager } from '@systems/audio'
import { CameraController } from '@systems/camera'
import { CareSystem } from '@systems/care'
import { CurrencyManager } from '@systems/currency'
import { SimClock } from '@systems/economy'
import { FoodManager } from '@systems/food'
import { InputManager } from '@systems/input'
import { MarketSystem } from '@systems/market'
import { PenGrid } from '@systems/park'
import { PhotoSystem } from '@systems/photo'
import { ProductionSystem, ResourceInventory } from '@systems/production'
import { Roster } from '@systems/roster'
import { createStateSyncHelpers, type GameStateType, IntegratedStateManager } from '@systems/state'
import { DebugPanel } from '@ui/debug'
import { UIManager } from '@ui/managers'

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
  /** Fixed-step clock that drives the park economy (production, hunger, breeding timers). */
  simClock: SimClock
  /** The creatures the player owns (genomes, care stats, age, lineage). */
  roster: Roster
  /** The hub build grid: fences, terrain edits and the pens they enclose. */
  park: PenGrid
  /** Feeding, hunger and mood for owned creatures. */
  care: CareSystem
  /** Resource output, collector bins and the player's carried resources. */
  production: ProductionSystem
  resources: ResourceInventory
  /** Selling resources and creatures for Safari Coins. */
  market: MarketSystem
  /** First-person building of fences, troughs and bins on the hub grid. */
  build: BuildModeManager
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
      sceneManager.parkStructures,
      (x, z) => sceneManager.terrainSystem.getFloorHeightAt(x, z)
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

    // Initialize the economy clock (systems subscribe to its ticks as they are added)
    const simClock = new SimClock()

    // Initialize the roster; owned creatures age with the economy clock
    const roster = new Roster()
    simClock.onTick(() => roster.advanceTicks(1))

    // Initialize the hub build grid and the care loop that looks after penned creatures
    const park = new PenGrid()
    const care = new CareSystem(roster, park)
    simClock.onTick((tick) => care.tick(tick))

    // Production runs after care in each tick, so a creature fed this cycle produces this cycle
    const resources = new ResourceInventory()
    const production = new ProductionSystem(roster, park, resources)
    simClock.onTick((tick) => production.tick(tick))

    // The market sells what production makes; demand recovers with the clock
    const market = new MarketSystem(roster, resources, currencyManager)
    simClock.onTick(() => market.tick())

    // Build mode draws the hub grid and lets the player edit it
    const build = new BuildModeManager({
      scene: sceneManager.scene,
      camera: cameraController,
      park,
      currency: currencyManager,
      ui: uiManager,
      heightAt: (x, z) => sceneManager.terrainSystem.getFloorHeightAt(x, z),
    })

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
      simClock,
      roster,
      park,
      care,
      production,
      resources,
      market,
      build,
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
    ui.onShaderConfigChange = (config) => shaders.updateConfig(config as Partial<ShaderConfig>)
    ui.onShaderToggle = (enabled) => {
      if (enabled) {
        shaders.enable()
      } else {
        shaders.disable()
      }
    }
    ui.onShaderPresetLoad = (preset) => shaders.loadPreset(preset as ShaderConfig)
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
    const { state } = this.systems

    // Listen for flow state changes
    state.onFlowStateChange((newState, prevState) => {
      log.debug(`Game state: ${prevState} → ${newState}`)
      this.handleStateChange(newState, prevState)
    })

    // Listen for subsystem state changes
    state.onSubsystemChange('ui', (_event) => {
      // UI updates handled by sync helpers
    })

    state.onSubsystemChange('multiplayer', (event) => {
      const mpState = event.newState as import('@systems/state').MultiplayerState
      const prevState = event.previousState as import('@systems/state').MultiplayerState
      if (mpState.isConnected && !prevState.isConnected) {
        log.debug('Multiplayer connected')
      } else if (!mpState.isConnected && prevState.isConnected) {
        log.debug('Multiplayer disconnected')
      }
    })
  }

  /**
   * Handle flow state changes
   */
  private handleStateChange(_newState: GameStateType, _prevState: GameStateType | null): void {
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
