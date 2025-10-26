import * as THREE from 'three'
import type { GameState } from './types'

/**
 * PeerAvatar renders the other player in the 3D scene
 * Handles visual representation, interpolation, and name labels
 */
export class PeerAvatar {
  private group: THREE.Group
  private cameraIndicator: THREE.Object3D
  private nameLabel: THREE.Sprite
  private scene: THREE.Scene
  private currentState: GameState | null = null
  private targetState: GameState | null = null
  private isVisible: boolean = false

  constructor(scene: THREE.Scene, playerName: string = 'Player') {
    this.scene = scene
    this.group = new THREE.Group()
    
    // Create avatar mesh with distinct visual style
    const avatarMesh = this.createAvatarMesh()
    this.group.add(avatarMesh)
    
    // Create camera direction indicator
    this.cameraIndicator = this.createCameraIndicator()
    this.group.add(this.cameraIndicator)
    
    // Create name label
    this.nameLabel = this.createNameLabel(playerName)
    this.group.add(this.nameLabel)
    
    // Initially hidden
    this.group.visible = false
    this.scene.add(this.group)
  }

  /**
   * Creates the avatar mesh with glowing outline and distinct color
   */
  private createAvatarMesh(): THREE.Group {
    const avatarGroup = new THREE.Group()
    
    // Main body - capsule shape (cylinder + spheres)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // Cyan color for distinction
      emissive: 0x00ffff,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.5,
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.6
    avatarGroup.add(body)
    
    // Head sphere
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8)
    const head = new THREE.Mesh(headGeometry, bodyMaterial)
    head.position.y = 1.4
    avatarGroup.add(head)
    
    // Glowing outline effect using a slightly larger transparent mesh
    const outlineGeometry = new THREE.CylinderGeometry(0.35, 0.35, 1.3, 8)
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    })
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
    outline.position.y = 0.6
    avatarGroup.add(outline)
    
    const headOutlineGeometry = new THREE.SphereGeometry(0.28, 8, 8)
    const headOutline = new THREE.Mesh(headOutlineGeometry, outlineMaterial)
    headOutline.position.y = 1.4
    avatarGroup.add(headOutline)
    
    return avatarGroup
  }

  /**
   * Creates a cone indicator showing where the peer is looking
   */
  private createCameraIndicator(): THREE.Object3D {
    const indicatorGroup = new THREE.Group()
    
    // Cone pointing forward (in the direction the peer is looking)
    const coneGeometry = new THREE.ConeGeometry(0.2, 0.6, 8)
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00, // Yellow for visibility
      transparent: true,
      opacity: 0.7,
    })
    const cone = new THREE.Mesh(coneGeometry, coneMaterial)
    
    // Rotate cone to point forward (default points up)
    cone.rotation.x = Math.PI / 2
    cone.position.z = -0.5 // Position in front of avatar
    cone.position.y = 1.2 // At head height
    
    indicatorGroup.add(cone)
    
    return indicatorGroup
  }

  /**
   * Creates a sprite-based name label above the avatar
   */
  private createNameLabel(name: string): THREE.Sprite {
    // Create canvas for text rendering
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 64
    
    // Draw text
    context.fillStyle = 'rgba(0, 0, 0, 0.6)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.font = 'Bold 24px Arial'
    context.fillStyle = 'white'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(name, canvas.width / 2, canvas.height / 2)
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
    const sprite = new THREE.Sprite(spriteMaterial)
    
    // Position above avatar
    sprite.position.y = 2.2
    sprite.scale.set(1.5, 0.375, 1)
    
    return sprite
  }

  /**
   * Updates the target state for interpolation
   */
  public updateState(state: GameState): void {
    this.targetState = state
    
    // Initialize current state if this is the first update
    if (!this.currentState) {
      this.currentState = { ...state }
      this.applyState(this.currentState)
    }
  }

  /**
   * Updates the avatar with interpolation for smooth movement
   */
  public update(deltaTime: number): void {
    if (!this.targetState || !this.currentState || !this.isVisible) {
      return
    }
    
    this.interpolateToTarget(deltaTime)
  }

  /**
   * Interpolates current state towards target state
   */
  private interpolateToTarget(deltaTime: number): void {
    if (!this.currentState || !this.targetState) return
    
    // Interpolation factor (higher = faster, lower = smoother)
    const lerpFactor = Math.min(deltaTime * 10, 1)
    
    // Interpolate position
    this.currentState.position.x += (this.targetState.position.x - this.currentState.position.x) * lerpFactor
    this.currentState.position.y += (this.targetState.position.y - this.currentState.position.y) * lerpFactor
    this.currentState.position.z += (this.targetState.position.z - this.currentState.position.z) * lerpFactor
    
    // Interpolate rotation
    this.currentState.rotation.x += (this.targetState.rotation.x - this.currentState.rotation.x) * lerpFactor
    this.currentState.rotation.y += (this.targetState.rotation.y - this.currentState.rotation.y) * lerpFactor
    this.currentState.rotation.z += (this.targetState.rotation.z - this.currentState.rotation.z) * lerpFactor
    
    // Apply interpolated state
    this.applyState(this.currentState)
  }

  /**
   * Applies a state to the avatar's transform
   */
  private applyState(state: GameState): void {
    this.group.position.set(state.position.x, state.position.y, state.position.z)
    
    // Apply rotation to camera indicator (shows where peer is looking)
    this.cameraIndicator.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z)
    
    // Make name label always face the camera
    if (this.scene.children.length > 0) {
      // Find the main camera (usually the first camera in the scene)
      const camera = this.scene.children.find(child => child instanceof THREE.Camera) as THREE.Camera
      if (camera) {
        this.nameLabel.lookAt(camera.position)
      }
    }
  }

  /**
   * Shows the avatar in the scene
   */
  public show(): void {
    this.isVisible = true
    this.group.visible = true
  }

  /**
   * Hides the avatar from the scene
   */
  public hide(): void {
    this.isVisible = false
    this.group.visible = false
  }

  /**
   * Disposes of all Three.js resources
   */
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.group)
    
    // Dispose of geometries and materials
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose())
        } else {
          object.material.dispose()
        }
      }
      
      if (object instanceof THREE.Sprite) {
        if (object.material.map) {
          object.material.map.dispose()
        }
        object.material.dispose()
      }
    })
    
    // Clear references
    this.currentState = null
    this.targetState = null
  }

  /**
   * Gets the current position of the avatar
   */
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone()
  }

  /**
   * Checks if the avatar is currently visible
   */
  public isShown(): boolean {
    return this.isVisible
  }
}
