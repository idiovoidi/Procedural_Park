/**
 * Avatar Preview
 * Small self-contained Three.js scene that renders a rotating player avatar into a canvas
 */

import * as THREE from 'three'

export class AvatarPreview {
  public readonly canvas: HTMLCanvasElement
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private mesh: THREE.Group | null = null
  private animationId: number | null = null

  constructor(size: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = size
    this.canvas.height = size
  }

  /**
   * Start rendering. The loop stops itself when isVisible() returns false;
   * call start() again to resume. The scene is created on first call.
   */
  public start(isVisible: () => boolean): void {
    if (!this.scene) this.init()
    if (this.animationId !== null) return
    this.animate(isVisible)
  }

  private init(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0f172a)

    this.camera = new THREE.PerspectiveCamera(50, this.canvas.width / this.canvas.height, 0.1, 100)
    this.camera.position.set(0, 1.5, 4)
    this.camera.lookAt(0, 1, 0)

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false })
    this.renderer.setSize(this.canvas.width, this.canvas.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(2, 3, 2)
    this.scene.add(directionalLight)

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.4)
    rimLight.position.set(-2, 1, -2)
    this.scene.add(rimLight)

    this.mesh = this.createAvatarMesh()
    this.scene.add(this.mesh)
  }

  private createAvatarMesh(): THREE.Group {
    const group = new THREE.Group()

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.2,
      metalness: 0.6,
      roughness: 0.4,
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.6
    group.add(body)

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const head = new THREE.Mesh(headGeometry, bodyMaterial)
    head.position.y = 1.4
    group.add(head)

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
    })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.1, 1.45, 0.2)
    group.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.1, 1.45, 0.2)
    group.add(rightEye)

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.y = 1
    group.add(glow)

    return group
  }

  private animate(isVisible: () => boolean): void {
    const { scene, camera, renderer, mesh } = this
    if (!scene || !camera || !renderer || !mesh) return

    const frame = () => {
      if (!isVisible()) {
        this.animationId = null
        return
      }

      mesh.rotation.y += 0.01
      mesh.position.y = Math.sin(Date.now() * 0.001) * 0.05

      renderer.render(scene, camera)
      this.animationId = requestAnimationFrame(frame)
    }

    frame()
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    this.renderer?.dispose()
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const mat of materials) mat.dispose()
      }
    })
    this.scene = null
  }
}
