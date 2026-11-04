import { disposeThreeObject, log } from '@core/utils'
import { type ShaderConfig, ShaderManager } from '@rendering/shaders'
import { parkFootprints } from '@systems/layout/park-sites'
import { WorldLayout } from '@systems/layout/WorldLayout'
import { TerrainSystem } from '@systems/terrain'
import { buildTrackPath, type StationDef, trackFootprints } from '@systems/track/track-path'
import * as THREE from 'three'
import { EnvironmentInteractions } from './environment-interactions'
import { ParkStructures } from './park-structures'
import { buildTrainTrack } from './structures/train-track'

export class SceneManager {
  public scene: THREE.Scene
  public renderer: THREE.WebGLRenderer
  /** Eye-level line the tram camera follows. */
  public curve: THREE.CatmullRomCurve3
  /** Centre line of the rails themselves. */
  public trackCurve: THREE.CatmullRomCurve3
  /** Everything standing on the ground, seen from above: drives the map and placement. */
  public layout: WorldLayout
  /** Where the tram stops, after being fitted to the layout. */
  public stations: StationDef[]
  public terrainSystem: TerrainSystem
  /** Highest pixel ratio the renderer may use (lowered by the quality governor). */
  private pixelRatioCap = 2
  /** The railway meshes, hidden while away from the hub. */
  private trackObject: THREE.Object3D | null = null
  public environmentInteractions: EnvironmentInteractions
  public parkStructures: ParkStructures
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  /** Soft sky/ground fill so the undersides of foliage and rocks are not pitch black. */
  private hemisphereLight: THREE.HemisphereLight
  public sky: THREE.Mesh | null = null
  private shaderManager: ShaderManager
  private onShaderManagerRecreated: ((manager: ShaderManager) => void) | null = null
  private currentDayNightMode: 'day' | 'night' = 'day'
  private handleResizeBound: () => void

  constructor(container: HTMLElement) {
    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#4a6b5a') // Much lighter initial background
    this.scene.fog = new THREE.Fog(0x4a6b5a, 50, 450)

    // Clear any existing Three.js canvas to prevent WebGL context conflicts
    const existingCanvas = container.querySelector('canvas')
    if (existingCanvas?.getContext('webgl')) {
      container.removeChild(existingCanvas)
    }

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap))
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
    this.hemisphereLight = new THREE.HemisphereLight(0xaac4dc, 0x4a5a38, 0.6)

    // Setup lighting
    this.setupLighting()
    this.setDayNightMode('day')

    // Generate sophisticated terrain first
    this.terrainSystem.generateTerrain(42)
    this.environmentInteractions.generateInteractionPoints(this.terrainSystem, 123)

    // Lay the railway over the terrain; the camera rides it at eye height
    const heightAt = (x: number, z: number) => this.terrainSystem.getFloorHeightAt(x, z)
    this.layout = new WorldLayout()
    const sites = parkFootprints()
    this.layout.add(...sites)
    const path = buildTrackPath(
      heightAt,
      undefined,
      sites.filter((f) => f.kind !== 'boundary')
    )
    this.stations = path.stations
    this.layout.add(...trackFootprints(path.trackCurve, path.stations))
    const clashes = this.layout.findOverlaps()
    if (clashes.length > 0) {
      console.warn(
        'Layout overlaps:',
        clashes.map(({ a, b }) => `${a.label} / ${b.label}`)
      )
    }
    this.trackCurve = path.trackCurve
    this.curve = path.rideCurve
    this.trackObject = buildTrainTrack(this.trackCurve, heightAt, this.stations)
    this.scene.add(this.trackObject)

    // Build park structures (gate, fence, plaza)
    this.parkStructures = new ParkStructures(this.scene)
    this.parkStructures.buildAll()

    // Initialize shader manager for post-processing (camera will be set on first render)
    this.shaderManager = new ShaderManager(
      this.renderer,
      this.scene,
      new THREE.PerspectiveCamera(),
      this.createShaderCallbacks()
    )

    // Handle window resize
    this.handleResizeBound = () => this.handleResize()
    window.addEventListener('resize', this.handleResizeBound)
  }

  /**
   * Show or hide everything that belongs to the hub: the park buildings, the railway and the
   * markers. The terrain itself is swapped with `loadTerrain`.
   */
  public setHubVisible(visible: boolean): void {
    this.parkStructures.getStructures().visible = visible
    if (this.trackObject) this.trackObject.visible = visible
  }

  /** Rebuild the ground: the hub (seed 42, flat park) or an expedition map (open wilds). */
  public loadTerrain(seed: number, hub: boolean): void {
    this.terrainSystem.generateTerrain(seed, hub)
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

    this.scene.add(this.directionalLight, this.ambientLight, this.hemisphereLight)
  }

  public getDayNightMode(): 'day' | 'night' {
    return this.currentDayNightMode
  }

  public setDayNightMode(mode: 'day' | 'night') {
    this.currentDayNightMode = mode
    if (mode === 'day') {
      this.directionalLight.color.set(0xffffff)
      this.directionalLight.intensity = 2.2
      this.ambientLight.color.set(0x406080)
      this.ambientLight.intensity = 0.6
      this.hemisphereLight.intensity = 0.6
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
      this.hemisphereLight.intensity = 0.15
      if (this.scene.fog) {
        this.scene.fog.color.set(0x2a3a4a) // Much lighter night fog
        ;(this.scene.fog as THREE.Fog).near = 50
        ;(this.scene.fog as THREE.Fog).far = 450
      }
      this.scene.background = new THREE.Color(0x2a3a4a) // Lighter night background
    }
  }

  // Removed createGround() - now handled by TerrainSystem

  // Removed createEnvironment() - now handled by TerrainSystem

  public render(camera: THREE.Camera, deltaTime: number = 0) {
    // Update shader manager's camera reference without destroying pipeline
    if (this.shaderManager && camera !== this.shaderManager.getCamera()) {
      this.shaderManager.setCamera(camera)
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

  public getShaderManager(): ShaderManager {
    return this.shaderManager
  }

  public onShaderManagerRecreate(callback: (manager: ShaderManager) => void): void {
    this.onShaderManagerRecreated = callback
    if (this.shaderManager && this.onShaderManagerRecreated) {
      this.onShaderManagerRecreated(this.shaderManager)
    }
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

  /** Apply a graphics quality: pixel density cap and shadows. Costs a resize, so call it rarely. */
  public setQuality(preset: { pixelRatio: number; shadows: boolean }): void {
    this.pixelRatioCap = preset.pixelRatio
    this.renderer.shadowMap.enabled = preset.shadows
    this.directionalLight.castShadow = preset.shadows
    // Shadow-casting changes need every material to be rebuilt once.
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) mat.needsUpdate = true
    })
    this.handleResize()
  }

  public getPixelRatio(): number {
    return this.renderer.getPixelRatio()
  }

  // Handle window resize with proper aspect ratio and pixel density management
  private handleResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = Math.min(window.devicePixelRatio, this.pixelRatioCap)

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
      const pixelRatio = Math.min(window.devicePixelRatio, this.pixelRatioCap)
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
        log.debug(`Shader quality auto-adjusted: ${reason}`)
      },
      onPerformanceWarning: (message: string) => {
        console.warn(`Shader performance: ${message}`)
      },
    }
  }

  // Cleanup method for proper resource disposal
  public dispose(): void {
    window.removeEventListener('resize', this.handleResizeBound)

    if (this.shaderManager) {
      this.shaderManager.dispose()
    }

    if (this.terrainSystem) {
      this.terrainSystem.dispose()
    }

    if (this.parkStructures) {
      this.parkStructures.dispose()
    }

    disposeThreeObject(this.scene, false)

    if (this.renderer) {
      this.renderer.dispose()
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
      }
    }
  }
}
