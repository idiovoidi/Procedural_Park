import * as THREE from 'three'
import { TerrainSystem } from './terrain-system'
import { EnvironmentInteractions } from './environment-interactions'
import { ParkStructures } from './park-structures'
import { ShaderManager, type ShaderConfig } from './shaders/ShaderManager'
import { TAU } from './utils'

export class SceneManager {
  public scene: THREE.Scene
  public renderer: THREE.WebGLRenderer
  public curve: THREE.CatmullRomCurve3
  public terrainSystem: TerrainSystem
  public environmentInteractions: EnvironmentInteractions
  public parkStructures: ParkStructures
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  public sky: THREE.Mesh | null = null
  private shaderManager: ShaderManager


  constructor(container: HTMLElement) {
    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#4a6b5a') // Much lighter initial background
    this.scene.fog = new THREE.Fog(0x4a6b5a, 50, 450)

    // Clear any existing Three.js canvas to prevent WebGL context conflicts
    const existingCanvas = container.querySelector('canvas')
    if (existingCanvas && existingCanvas.getContext('webgl')) {
      container.removeChild(existingCanvas)
    }

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // Initialize terrain and interaction systems
    this.terrainSystem = new TerrainSystem(this.scene)
    this.environmentInteractions = new EnvironmentInteractions(this.scene)

    // Initialize lights
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.2)
    this.ambientLight = new THREE.AmbientLight(0x406080, 0.6)

    // Setup lighting
    this.setupLighting()
    this.setDayNightMode('day')

    // Generate sophisticated terrain first
    this.terrainSystem.generateTerrain(42)
    this.environmentInteractions.generateInteractionPoints(this.terrainSystem, 123)

    // Create the ride path (now that terrain is available)
    this.curve = this.createRidePath()

    // Create track visualization
    this.createTrack()

    // Build park structures (gate, fence, plaza)
    this.parkStructures = new ParkStructures(this.scene)
    this.parkStructures.buildAll()

    // Initialize shader manager for post-processing (camera will be set on first render)
    this.shaderManager = new ShaderManager(this.renderer, this.scene, new THREE.PerspectiveCamera(), this.createShaderCallbacks())

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize()
    })
  }

  private setupLighting() {
    this.directionalLight.position.set(5, 10, 3)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 50
    this.directionalLight.shadow.camera.left = -20
    this.directionalLight.shadow.camera.right = 20
    this.directionalLight.shadow.camera.top = 20
    this.directionalLight.shadow.camera.bottom = -20

    this.scene.add(this.directionalLight, this.ambientLight)
  }

  public setDayNightMode(mode: 'day' | 'night') {
    if (mode === 'day') {
      this.directionalLight.color.set(0xffffff)
      this.directionalLight.intensity = 2.2
      this.ambientLight.color.set(0x406080)
      this.ambientLight.intensity = 0.6
      if (this.scene.fog) {
        this.scene.fog.color.set(0x87ceeb)
        ;(this.scene.fog as THREE.Fog).near = 50
        ;(this.scene.fog as THREE.Fog).far = 450
      }
      this.scene.background = new THREE.Color(0x87ceeb)
    } else {
      this.directionalLight.color.set(0x406080)
      this.directionalLight.intensity = 1.2 // Brighter night lighting
      this.ambientLight.color.set(0x203040) // Lighter night ambient
      this.ambientLight.intensity = 0.5
      if (this.scene.fog) {
        this.scene.fog.color.set(0x2a3a4a) // Much lighter night fog
        ;(this.scene.fog as THREE.Fog).near = 50
        ;(this.scene.fog as THREE.Fog).far = 450
      }
      this.scene.background = new THREE.Color(0x2a3a4a) // Lighter night background
    }
  }

  // Removed createGround() - now handled by TerrainSystem

  private createRidePath(): THREE.CatmullRomCurve3 {
    const pathPoints: THREE.Vector3[] = []
    const seed = Math.random() * 1000
    const numPoints = 50 + Math.floor(Math.random() * 30) // 50-80 points (much longer)

    // Create a more varied, randomized path
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints
      const angle = t * TAU

      // Base circular path with random variations - larger radius for longer ride
      const baseRadius = 40 + Math.sin(seed + angle * 3) * 15
      const radiusVariation = Math.sin(seed * 2 + angle * 5) * 10
      const r = baseRadius + radiusVariation

      // Add some figure-8 and spiral elements - smoother curves
      const spiralFactor = Math.sin(seed + angle * 2) * 0.2
      const figure8Factor = Math.sin(angle * 2) * 0.3

      const x = Math.sin(angle + spiralFactor) * r + Math.sin(angle * 2) * figure8Factor * 20
      const z = Math.cos(angle + spiralFactor) * r + Math.cos(angle * 2) * figure8Factor * 20

      // Much less height variation for smoother ride
      const baseHeight = 1.6
      const heightVariation =
        Math.sin(seed + angle * 4) * 0.5 + Math.cos(seed * 1.5 + angle * 6) * 0.3
      const terrainHeight = this.terrainSystem.getHeightAt(x, z)
      const y = Math.max(baseHeight, terrainHeight + 1.0) + heightVariation

      pathPoints.push(new THREE.Vector3(x, y, z))
    }

    return new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal', 0.2)
  }

  private createTrack() {
    const track = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 600, 0.25, 8, true),
      new THREE.MeshStandardMaterial({
        color: 0x2a384a,
        metalness: 0.35,
        roughness: 0.6,
      })
    )
    track.castShadow = false
    track.receiveShadow = true
    this.scene.add(track)
  }

  // Removed createEnvironment() - now handled by TerrainSystem

  public render(camera: THREE.Camera, deltaTime: number = 0) {
    // Update shader manager's camera reference if needed
    if (this.shaderManager && camera !== this.shaderManager['camera']) {
      this.updateShaderCamera(camera)
    }
    
    // Use shader manager for rendering with post-processing
    this.shaderManager.render(deltaTime)
  }

  public update(time: number) {
    // Update park structure animations
    if (this.parkStructures) {
      this.parkStructures.update(time)
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  public capturePhoto(): string {
    return this.renderer.domElement.toDataURL('image/jpeg', 0.85)
  }

  // Shader management methods
  public updateShaderConfig(config: Partial<ShaderConfig>): void {
    this.shaderManager.updateConfig(config)
  }

  public getShaderConfig(): ShaderConfig {
    return this.shaderManager.getConfig()
  }

  public setShaderEnabled(enabled: boolean): void {
    this.shaderManager.setEnabled(enabled)
  }

  public hasShaderErrors(): boolean {
    return this.shaderManager.hasErrors()
  }

  // Performance monitoring methods
  public getShaderPerformanceMetrics() {
    return this.shaderManager.getPerformanceMetrics()
  }

  public getShaderPerformanceReport(): string {
    return this.shaderManager.getPerformanceReport()
  }

  public setShaderAutoPerformanceAdjustment(enabled: boolean): void {
    this.shaderManager.setAutoPerformanceAdjustment(enabled)
  }

  public isShaderAutoPerformanceAdjustmentEnabled(): boolean {
    return this.shaderManager.isAutoPerformanceAdjustmentEnabled()
  }

  public getShaderQualityLevel(): string {
    return this.shaderManager.getCurrentQualityLevel()
  }

  private updateShaderCamera(camera: THREE.Camera): void {
    // Recreate shader manager with new camera
    const currentConfig = this.shaderManager.getConfig()
    const autoPerformanceEnabled = this.shaderManager.isAutoPerformanceAdjustmentEnabled()
    this.shaderManager.dispose()
    
    this.shaderManager = new ShaderManager(this.renderer, this.scene, camera, this.createShaderCallbacks())
    this.shaderManager.updateConfig(currentConfig)
    this.shaderManager.setAutoPerformanceAdjustment(autoPerformanceEnabled)
  }

  // Handle window resize with proper aspect ratio and pixel density management
  private handleResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update renderer size and pixel ratio
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height)

    // Update post-processing pipeline
    this.shaderManager.setSize(width, height)

    // Note: Camera aspect ratio is handled by CameraController
  }

  // Public method to trigger resize (useful for programmatic resizing)
  public resize(width?: number, height?: number): void {
    if (width && height) {
      // Custom size
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      this.renderer.setPixelRatio(pixelRatio)
      this.renderer.setSize(width, height)
      this.shaderManager.setSize(width, height)
    } else {
      // Use current window size
      this.handleResize()
    }
  }

  // Create shader callbacks for UI integration
  private createShaderCallbacks() {
    return {
      onPerformanceAdjustment: (_config: ShaderConfig, reason: string) => {
        console.log(`Shader quality auto-adjusted: ${reason}`)
      },
      onPerformanceWarning: (message: string) => {
        console.warn(`Shader performance: ${message}`)
      }
    }
  }

  // Cleanup method for proper resource disposal
  public dispose(): void {
    if (this.shaderManager) {
      this.shaderManager.dispose()
    }
  }
}
