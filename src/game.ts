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


export class Game {
  private sceneManager: SceneManager
  private cameraController: CameraController
  private uiManager: UIManager
  private photoSystem: PhotoSystem
  private audioManager: AudioManager
  private videoRecorder: VideoRecorder
  private debugPanel: DebugPanel
  private creatures: CreatureInstance[] = []
  private experimentCreature: CreatureInstance | null = null
  private isRunning = false
  private lastTime = 0
  private recordingIndicator: HTMLElement | null = null
  private shaderConfig: ShaderConfig

  constructor(container: HTMLElement) {
    // Show loading screen
    const loadingEl = document.getElementById('loading')
    loadingEl?.classList.remove('hidden')

    // Preload shader resources for better performance
    this.preloadShaderResources()

    // Initialize shader configuration with Inscryption-style defaults
    this.shaderConfig = {
      enabled: true,
      luminanceThreshold: 0.3,
      colorSteps: 8,
      intensity: 1.0,
      darknessBias: 0.4,
      grittiness: 0.6,
      filmGrainIntensity: 0.8,
      vignetteStrength: 0.5,
    }

    // Initialize all systems
    this.sceneManager = new SceneManager(container)
    this.cameraController = new CameraController(this.sceneManager.curve)
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
    
    // Setup shader debug UI callbacks
    this.uiManager.onShaderConfigChange = (config) => this.updateShaderConfig(config)
    this.uiManager.onShaderToggle = (enabled) => this.setShaderEnabled(enabled)
    this.uiManager.onShaderPresetLoad = (preset) => this.updateShaderConfig(preset)
    
    // Initialize shader debug UI
    this.uiManager.initializeShaderDebugUI(this.shaderConfig)

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

    // Generate creatures
    this.spawnCreatures()

    // Create experiment creature in lab
    this.spawnExperimentCreature()

    // Setup input handlers
    this.setupInputHandlers()

    // Start ambient sounds
    this.startAmbientAudio()

    // Hide loading screen
    setTimeout(() => {
      loadingEl?.classList.add('hidden')
    }, GAME_CONFIG.LOADING_SCREEN_DELAY_MS)
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
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        this.takePhoto()
      }
      if (e.key.toLowerCase() === 'r') {
        this.restartRide()
      }

      // Speed controls
      if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
        e.preventDefault()
        this.increaseSpeed()
      }
      if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
        e.preventDefault()
        this.decreaseSpeed()
      }

      // Pause/Resume
      if (e.key.toLowerCase() === 'p' || e.key === 'Pause') {
        e.preventDefault()
        this.togglePause()
      }

      // Toggle camera mode
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault()
        this.toggleCameraMode()
      }

      // Video recording
      if (e.key === ';') {
        e.preventDefault()
        this.toggleVideoRecording()
      }

      // Randomize experiment creature
      if (e.key.toLowerCase() === 'x') {
        e.preventDefault()
        this.randomizeExperimentCreature()
      }

      // Toggle shader on/off
      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        this.toggleShader()
      }

      // Shader parameter adjustments (development controls)
      if (e.key === '[') {
        e.preventDefault()
        this.adjustShaderParameter('luminanceThreshold', -0.05)
      }
      if (e.key === ']') {
        e.preventDefault()
        this.adjustShaderParameter('luminanceThreshold', 0.05)
      }
      if (e.key === '{') {
        e.preventDefault()
        this.adjustShaderParameter('intensity', -0.1)
      }
      if (e.key === '}') {
        e.preventDefault()
        this.adjustShaderParameter('intensity', 0.1)
      }
    })
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
    const isPaused = this.cameraController.togglePause()
    this.uiManager.showToast(isPaused ? '⏸ Paused' : '▶ Resumed')
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

    // Log detailed score breakdown for debugging
    if (result.creature) {
      const breakdown = this.photoSystem.getScoreBreakdown(
        result.creature,
        this.cameraController.camera
      )
      console.log(`Photo of ${result.creatureName}:`, breakdown)
    }
  }

  private restartRide() {
    // Reset camera position
    this.cameraController = new CameraController(this.sceneManager.curve)
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
    if (!this.isRunning) return

    const dtMs = Math.min(GAME_CONFIG.MAX_FRAME_TIME_MS, now - this.lastTime)
    this.lastTime = now
    const dt = dtMs / 1000

    // Update all systems
    this.cameraController.update(dt)
    this.updateCreatures(dt)
    this.updateMiniMap()
    this.sceneManager.update(now / 1000) // Update park animations
    this.updateRecordingIndicator() // Update recording timer

    // Update debug panel
    this.debugPanel.update(dt, this.sceneManager.renderer, this.cameraController.camera, {
      creatures: this.creatures.length,
      cameraMode: this.cameraController.getMode(),
      rideProgress: this.cameraController.getRideProgress(),
    })

    // Shader status updates removed for simplicity

    // Render with deltaTime for shader animations
    this.sceneManager.render(this.cameraController.camera, dt)

    requestAnimationFrame(this.gameLoop)
  }

  public start() {
    if (this.isRunning) return

    this.isRunning = true
    this.lastTime = performance.now()
    this.gameLoop()
  }

  public stop() {
    this.isRunning = false
    this.audioManager.stopAllAmbientSounds()
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
    }
  }

  private setRideSpeed(speed: number) {
    this.cameraController.setRideSpeed(speed)
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
  }

  public clearGallery() {
    this.uiManager.clearGallery()
    this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)
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
    
    const statusText = this.shaderConfig.enabled ? '🎨 Inscryption Shader ON' : '🎨 Inscryption Shader OFF'
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
      compatibility: null // Simplified for now
    }
  }
}
