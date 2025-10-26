import * as THREE from 'three';
import type { GameState } from './types';

/**
 * PeerAvatar - Visual representation of another player in the 3D scene
 * 
 * Features:
 * - Distinct visual style with glowing outline
 * - Camera direction indicator (cone showing where peer is looking)
 * - Name label rendered as sprite
 * - Position interpolation for smooth movement
 */
export class PeerAvatar {
  private group: THREE.Group;
  private avatarMesh: THREE.Mesh;
  private cameraIndicator: THREE.Mesh;
  private nameLabel: THREE.Sprite;
  private scene: THREE.Scene;
  
  // Interpolation state
  private currentPosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private currentRotation: THREE.Euler;
  private targetRotation: THREE.Euler;
  private interpolationSpeed = 10; // Higher = faster interpolation

  constructor(scene: THREE.Scene, playerName: string) {
    this.scene = scene;
    this.group = new THREE.Group();
    
    // Initialize interpolation state
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.currentRotation = new THREE.Euler();
    this.targetRotation = new THREE.Euler();
    
    // Create visual components
    this.avatarMesh = this.createAvatarMesh();
    this.cameraIndicator = this.createCameraIndicator();
    this.nameLabel = this.createNameLabel(playerName);
    
    // Add components to group
    this.group.add(this.avatarMesh);
    this.group.add(this.cameraIndicator);
    this.group.add(this.nameLabel);
    
    // Add to scene
    this.scene.add(this.group);
  }

  /**
   * Create the avatar mesh with distinct visual style
   * Uses a capsule-like shape with glowing material
   */
  private createAvatarMesh(): THREE.Mesh {
    // Create a capsule-like shape (cylinder with spheres on top/bottom)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const headGeometry = new THREE.SphereGeometry(0.35, 8, 8);
    
    // Merge geometries for the body
    const bodyMesh = new THREE.Mesh(bodyGeometry);
    bodyMesh.position.y = 0.6;
    
    const headMesh = new THREE.Mesh(headGeometry);
    headMesh.position.y = 1.4;
    
    // Create a group for the avatar body
    const avatarGroup = new THREE.Group();
    avatarGroup.add(bodyMesh);
    avatarGroup.add(headMesh);
    
    // Create glowing material with distinct color
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffaa, // Cyan-green color
      emissive: 0x00ffaa,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7,
    });
    
    bodyMesh.material = material;
    headMesh.material = material;
    
    // Create outline effect using a slightly larger mesh
    const outlineGeometry = new THREE.CylinderGeometry(0.32, 0.32, 1.24, 8);
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.3,
    });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.position.y = 0.6;
    avatarGroup.add(outline);
    
    // Create head outline
    const headOutlineGeometry = new THREE.SphereGeometry(0.37, 8, 8);
    const headOutline = new THREE.Mesh(headOutlineGeometry, outlineMaterial);
    headOutline.position.y = 1.4;
    avatarGroup.add(headOutline);
    
    // Wrap in a mesh for easier manipulation
    const container = new THREE.Mesh();
    container.add(avatarGroup);
    
    return container;
  }

  /**
   * Create camera direction indicator
   * Shows where the peer is looking using a cone
   */
  private createCameraIndicator(): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(0.2, 0.6, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00, // Yellow color for visibility
      transparent: true,
      opacity: 0.6,
    });
    
    const cone = new THREE.Mesh(geometry, material);
    
    // Position cone in front of avatar at head height
    cone.position.set(0, 1.4, 0);
    
    // Rotate cone to point forward (default points up)
    cone.rotation.x = Math.PI / 2;
    
    return cone;
  }

  /**
   * Create name label using THREE.Sprite
   * Displays the player's name above their avatar
   */
  private createNameLabel(name: string): THREE.Sprite {
    // Create canvas for text rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Set canvas size
    canvas.width = 256;
    canvas.height = 64;
    
    // Configure text style
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.lineWidth = 4;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw text with outline
    context.strokeText(name, 128, 32);
    context.fillText(name, 128, 32);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // Always render on top
    });
    
    const sprite = new THREE.Sprite(material);
    
    // Position above avatar
    sprite.position.y = 2.2;
    
    // Scale sprite
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }

  /**
   * Update avatar with new state from peer
   * Uses interpolation for smooth movement
   */
  public update(state: GameState, deltaTime: number): void {
    // Update target position and rotation
    this.targetPosition.set(state.position.x, state.position.y, state.position.z);
    this.targetRotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    
    // Interpolate position for smooth movement
    const alpha = Math.min(1, this.interpolationSpeed * deltaTime);
    this.currentPosition.lerp(this.targetPosition, alpha);
    
    // Interpolate rotation
    const currentQuat = new THREE.Quaternion().setFromEuler(this.currentRotation);
    const targetQuat = new THREE.Quaternion().setFromEuler(this.targetRotation);
    currentQuat.slerp(targetQuat, alpha);
    this.currentRotation.setFromQuaternion(currentQuat);
    
    // Apply interpolated position
    this.group.position.copy(this.currentPosition);
    
    // Update camera indicator rotation to show where peer is looking
    this.cameraIndicator.rotation.set(
      this.currentRotation.x + Math.PI / 2, // Adjust for cone orientation
      this.currentRotation.y,
      this.currentRotation.z
    );
    
    // Position camera indicator in front of avatar
    const forward = new THREE.Vector3(0, 0, -0.8);
    forward.applyEuler(this.currentRotation);
    this.cameraIndicator.position.set(
      forward.x,
      1.4, // Head height
      forward.z
    );
  }

  /**
   * Show the avatar
   */
  public show(): void {
    this.group.visible = true;
  }

  /**
   * Hide the avatar
   */
  public hide(): void {
    this.group.visible = false;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.group);
    
    // Dispose geometries
    if (this.avatarMesh.geometry) {
      this.avatarMesh.geometry.dispose();
    }
    if (this.cameraIndicator.geometry) {
      this.cameraIndicator.geometry.dispose();
    }
    
    // Dispose materials
    if (this.avatarMesh.material) {
      if (Array.isArray(this.avatarMesh.material)) {
        this.avatarMesh.material.forEach(m => m.dispose());
      } else {
        this.avatarMesh.material.dispose();
      }
    }
    if (this.cameraIndicator.material) {
      if (Array.isArray(this.cameraIndicator.material)) {
        this.cameraIndicator.material.forEach(m => m.dispose());
      } else {
        this.cameraIndicator.material.dispose();
      }
    }
    
    // Dispose sprite material and texture
    if (this.nameLabel.material) {
      if (this.nameLabel.material.map) {
        this.nameLabel.material.map.dispose();
      }
      this.nameLabel.material.dispose();
    }
    
    // Dispose all children recursively
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  /**
   * Get the current position of the avatar
   */
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  /**
   * Set interpolation speed (higher = faster, less smooth)
   */
  public setInterpolationSpeed(speed: number): void {
    this.interpolationSpeed = speed;
  }
}
