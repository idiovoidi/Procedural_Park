import { ObjectPool } from '@core/utils'
import * as THREE from 'three'

export type ParticleType = 'dust' | 'splash' | 'sparkle' | 'leaf' | 'feather'

export interface ParticleConfig {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  lifetime: number
  gravity?: number
  fadeOut?: boolean
}

export class Particle {
  public mesh: THREE.Mesh
  public velocity: THREE.Vector3
  public lifetime: number
  public maxLifetime: number
  public gravity: number
  public fadeOut: boolean
  public active: boolean = false

  constructor() {
    const geometry = new THREE.PlaneGeometry(0.1, 0.1)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.velocity = new THREE.Vector3()
    this.lifetime = 0
    this.maxLifetime = 1
    this.gravity = 0
    this.fadeOut = true
  }

  public init(config: ParticleConfig): void {
    this.mesh.position.copy(config.position)
    this.velocity.copy(config.velocity)
    ;(this.mesh.material as THREE.MeshBasicMaterial).color.copy(config.color)
    ;(this.mesh.material as THREE.MeshBasicMaterial).opacity = 1
    this.mesh.scale.setScalar(config.size)
    this.lifetime = config.lifetime
    this.maxLifetime = config.lifetime
    this.gravity = config.gravity ?? -9.8
    this.fadeOut = config.fadeOut ?? true
    this.active = true
    this.mesh.visible = true
  }

  public update(dt: number): boolean {
    if (!this.active) return false

    this.lifetime -= dt

    if (this.lifetime <= 0) {
      this.active = false
      this.mesh.visible = false
      return false
    }

    // Update position
    this.mesh.position.addScaledVector(this.velocity, dt)

    // Apply gravity
    this.velocity.y += this.gravity * dt

    // Fade out
    if (this.fadeOut) {
      const alpha = this.lifetime / this.maxLifetime
      ;(this.mesh.material as THREE.MeshBasicMaterial).opacity = alpha
    }

    // Billboard effect (face camera)
    this.mesh.rotation.y += dt * 2

    return true
  }

  public reset(): void {
    this.active = false
    this.mesh.visible = false
    this.velocity.set(0, 0, 0)
    this.lifetime = 0
  }
}

export class ParticleSystem {
  private scene: THREE.Scene
  private particlePool: ObjectPool<Particle>
  private activeParticles: Set<Particle> = new Set()
  private particleGroup: THREE.Group

  constructor(scene: THREE.Scene, poolSize: number = 100, maxSize: number = 500) {
    this.scene = scene
    this.particleGroup = new THREE.Group()
    this.particleGroup.name = 'ParticleSystem'
    this.scene.add(this.particleGroup)

    this.particlePool = new ObjectPool<Particle>(
      () => {
        const particle = new Particle()
        this.particleGroup.add(particle.mesh)
        return particle
      },
      (particle) => particle.reset(),
      poolSize,
      maxSize
    )
  }

  public emit(config: ParticleConfig): void {
    const particle = this.particlePool.get()
    particle.init(config)
    this.activeParticles.add(particle)
  }

  public emitBurst(
    type: ParticleType,
    position: THREE.Vector3,
    count: number = 10,
    options?: Partial<ParticleConfig>
  ): void {
    for (let i = 0; i < count; i++) {
      const config = this.getParticleConfig(type, position, options)
      this.emit(config)
    }
  }

  private getParticleConfig(
    type: ParticleType,
    position: THREE.Vector3,
    options?: Partial<ParticleConfig>
  ): ParticleConfig {
    const baseConfig: ParticleConfig = {
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      color: new THREE.Color(0xffffff),
      size: 0.1,
      lifetime: 1.0,
      gravity: -9.8,
      fadeOut: true,
    }

    switch (type) {
      case 'dust':
        baseConfig.color.setHSL(0.1, 0.2, 0.6)
        baseConfig.size = 0.05 + Math.random() * 0.05
        baseConfig.lifetime = 0.5 + Math.random() * 0.5
        baseConfig.velocity.multiplyScalar(0.5)
        baseConfig.gravity = -2
        break

      case 'splash':
        baseConfig.color.setHSL(0.55, 0.8, 0.7)
        baseConfig.size = 0.08 + Math.random() * 0.08
        baseConfig.lifetime = 0.3 + Math.random() * 0.4
        baseConfig.velocity.y = Math.random() * 3 + 1
        baseConfig.velocity.x = (Math.random() - 0.5) * 4
        baseConfig.velocity.z = (Math.random() - 0.5) * 4
        break

      case 'sparkle':
        baseConfig.color.setHSL(Math.random(), 0.8, 0.8)
        baseConfig.size = 0.1 + Math.random() * 0.1
        baseConfig.lifetime = 0.5 + Math.random() * 0.5
        baseConfig.velocity.multiplyScalar(0.3)
        baseConfig.gravity = 0
        break

      case 'leaf':
        baseConfig.color.setHSL(0.3, 0.6, 0.4)
        baseConfig.size = 0.15 + Math.random() * 0.1
        baseConfig.lifetime = 2.0 + Math.random() * 2.0
        baseConfig.velocity.y = Math.random() * 0.5
        baseConfig.velocity.x = (Math.random() - 0.5) * 1
        baseConfig.velocity.z = (Math.random() - 0.5) * 1
        baseConfig.gravity = -1
        break

      case 'feather':
        baseConfig.color.setHSL(0, 0, 0.9)
        baseConfig.size = 0.2 + Math.random() * 0.15
        baseConfig.lifetime = 3.0 + Math.random() * 2.0
        baseConfig.velocity.y = Math.random() * 0.3
        baseConfig.velocity.x = (Math.random() - 0.5) * 0.5
        baseConfig.velocity.z = (Math.random() - 0.5) * 0.5
        baseConfig.gravity = -0.5
        break
    }

    // Apply custom options
    if (options) {
      Object.assign(baseConfig, options)
    }

    return baseConfig
  }

  public update(dt: number): void {
    const particlesToRelease: Particle[] = []

    this.activeParticles.forEach((particle) => {
      const stillActive = particle.update(dt)
      if (!stillActive) {
        particlesToRelease.push(particle)
      }
    })

    // Release inactive particles back to pool
    particlesToRelease.forEach((particle) => {
      this.activeParticles.delete(particle)
      this.particlePool.release(particle)
    })
  }

  public clear(): void {
    this.activeParticles.forEach((particle) => {
      particle.reset()
      this.particlePool.release(particle)
    })
    this.activeParticles.clear()
  }

  public getStats() {
    return {
      active: this.activeParticles.size,
      pooled: this.particlePool.getAvailableCount(),
      total: this.particlePool.size(),
    }
  }

  public dispose(): void {
    this.clear()
    this.particlePool.clear()
    this.scene.remove(this.particleGroup)
  }
}
