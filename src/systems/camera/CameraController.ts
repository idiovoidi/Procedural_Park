import { HALF_PI } from '@core/constants'
import { getPooledVector3, memoizedCos, memoizedSin, releaseVector3 } from '@core/utils'
import type { InputManager } from '@systems/input'
import * as THREE from 'three'
import type { CameraMode } from './types'

export class CameraController {
  public camera: THREE.PerspectiveCamera
  public curve: THREE.CatmullRomCurve3

  private mode: CameraMode = 'ride'
  private rideT = 0
  private rideSpeed = 0.025 // 40s per loop
  private isPaused = false
  private yaw = 0
  private pitch = 0
  private yawTarget = 0
  private pitchTarget = 0
  private isDragging = false

  // Free roam controls
  private moveForward = false
  private moveBackward = false
  private moveLeft = false
  private moveRight = false
  private isSprinting = false
  private moveSpeed = 5.0
  private sprintSpeed = 12.0
  private freeRoamPosition = new THREE.Vector3(0, 1.6, 5)

  // Jump controls
  private isJumping = false
  private jumpVelocity = 0
  private jumpSpeed = 8.0
  private gravity = 20.0
  private groundHeight = 1.6

  private inputManager: InputManager | null = null

  constructor(curve: THREE.CatmullRomCurve3, inputManager?: InputManager) {
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600)
    this.camera.position.set(0, 1.6, 5)
    this.curve = curve

    if (inputManager) {
      this.setInputManager(inputManager)
    }

    this.setupEventListeners()
  }

  public setInputManager(inputManager: InputManager) {
    this.inputManager = inputManager
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
  }

  public setupMouseControls(canvas: HTMLCanvasElement) {
    // Set canvas in input manager for pointer lock
    if (this.inputManager) {
      this.inputManager.setCanvas(canvas)
    }

    // Ride mode: drag to look
    canvas.addEventListener('mousedown', (_e) => {
      if (this.mode === 'ride') {
        this.isDragging = true
      }
    })

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false
    })

    // Click to enter pointer lock in free roam mode
    canvas.addEventListener('click', () => {
      if (this.mode === 'freeroam' && this.inputManager && !this.inputManager.isPointerLocked()) {
        this.inputManager.requestPointerLock()
      }
    })
  }

  public update(dtSeconds: number) {
    // Update movement state from input manager
    if (this.inputManager) {
      this.updateFromInputManager()
    }

    if (this.mode === 'ride') {
      this.updateRideMode(dtSeconds)
    } else {
      this.updateFreeRoamMode(dtSeconds)
    }
  }

  private updateFromInputManager() {
    if (!this.inputManager) return

    // Update movement keys
    this.moveForward = this.inputManager.isKeyDown('w')
    this.moveBackward = this.inputManager.isKeyDown('s')
    this.moveLeft = this.inputManager.isKeyDown('a')
    this.moveRight = this.inputManager.isKeyDown('d')
    this.isSprinting = this.inputManager.isKeyDown('Shift')

    // Update look direction from mouse delta (in freeroam with pointer lock)
    if (this.mode === 'freeroam' && this.inputManager.isPointerLocked()) {
      const delta = this.inputManager.getMouseDelta()
      this.yawTarget -= delta.x * 0.002
      this.pitchTarget = Math.max(
        -HALF_PI + 0.1,
        Math.min(HALF_PI - 0.1, this.pitchTarget - delta.y * 0.002)
      )
    }

    // Update look direction from mouse drag (in ride mode when dragging)
    if (this.mode === 'ride' && this.isDragging) {
      const delta = this.inputManager.getMouseDelta()
      this.yawTarget += delta.x * 0.0025
      this.pitchTarget = Math.max(-0.6, Math.min(0.6, this.pitchTarget + delta.y * 0.002))
    }

    // Update look direction from arrow keys (in ride mode)
    if (this.mode === 'ride') {
      if (this.inputManager.isKeyDown('ArrowLeft')) this.yawTarget -= 0.05 * (1 / 60)
      if (this.inputManager.isKeyDown('ArrowRight')) this.yawTarget += 0.05 * (1 / 60)
      if (this.inputManager.isKeyDown('ArrowUp'))
        this.pitchTarget = Math.min(this.pitchTarget + 0.04 * (1 / 60), 0.6)
      if (this.inputManager.isKeyDown('ArrowDown'))
        this.pitchTarget = Math.max(this.pitchTarget - 0.04 * (1 / 60), -0.6)
    }
  }

  private updateRideMode(dtSeconds: number) {
    // Only advance ride position if not paused
    if (!this.isPaused) {
      this.rideT = (this.rideT + this.rideSpeed * dtSeconds) % 1
    }

    const pos = this.curve.getPointAt(this.rideT)
    const tangent = this.curve.getTangentAt(this.rideT)
    const normal = getPooledVector3(0, 1, 0)
    const side = getPooledVector3().crossVectors(tangent, normal).normalize()

    this.camera.position.copy(pos)
    const lookTarget = getPooledVector3().copy(pos).addScaledVector(tangent, 2)

    // Smooth input for stability
    this.yaw += (this.yawTarget - this.yaw) * Math.min(1, 10 * dtSeconds)
    this.pitch += (this.pitchTarget - this.pitch) * Math.min(1, 10 * dtSeconds)

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(normal, this.yaw)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(side, this.pitch)
    lookTarget.sub(pos).applyQuaternion(yawQuat).applyQuaternion(pitchQuat).add(pos)
    this.camera.lookAt(lookTarget)

    // Clean up pooled vectors
    releaseVector3(normal)
    releaseVector3(side)
    releaseVector3(lookTarget)
  }

  private updateFreeRoamMode(dtSeconds: number) {
    // Direct camera control (no smoothing for first-person feel)
    this.yaw = this.yawTarget
    this.pitch = this.pitchTarget

    // Calculate movement direction based on camera yaw (fixed directions)
    const forward = getPooledVector3(-memoizedSin(this.yaw), 0, -memoizedCos(this.yaw))
    const right = getPooledVector3(memoizedCos(this.yaw), 0, -memoizedSin(this.yaw))

    // Apply WASD movement
    const velocity = getPooledVector3()
    if (this.moveForward) velocity.add(forward)
    if (this.moveBackward) velocity.sub(forward)
    if (this.moveLeft) velocity.sub(right)
    if (this.moveRight) velocity.add(right)

    // Normalize and apply speed (with sprint multiplier)
    if (velocity.length() > 0) {
      const currentSpeed = this.isSprinting ? this.sprintSpeed : this.moveSpeed
      velocity.normalize().multiplyScalar(currentSpeed * dtSeconds)
      this.freeRoamPosition.add(velocity)
    }

    // Apply jump physics
    if (this.isJumping) {
      this.jumpVelocity -= this.gravity * dtSeconds
      this.freeRoamPosition.y += this.jumpVelocity * dtSeconds

      // Check if landed
      if (this.freeRoamPosition.y <= this.groundHeight) {
        this.freeRoamPosition.y = this.groundHeight
        this.isJumping = false
        this.jumpVelocity = 0
      }
    }

    // Update camera position and look direction
    this.camera.position.copy(this.freeRoamPosition)

    // Calculate look target (fixed to match movement)
    const lookTarget = getPooledVector3()
    lookTarget.x = this.freeRoamPosition.x - memoizedSin(this.yaw) * memoizedCos(this.pitch)
    lookTarget.y = this.freeRoamPosition.y + memoizedSin(this.pitch)
    lookTarget.z = this.freeRoamPosition.z - memoizedCos(this.yaw) * memoizedCos(this.pitch)

    this.camera.lookAt(lookTarget)

    // Clean up pooled vectors
    releaseVector3(forward)
    releaseVector3(right)
    releaseVector3(velocity)
    releaseVector3(lookTarget)
  }

  public getRideProgress(): number {
    return this.rideT
  }

  public setRideSpeed(speed: number) {
    this.rideSpeed = speed
  }

  public getRideSpeed(): number {
    return this.rideSpeed
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused
    return this.isPaused
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused
  }

  public isPausedState(): boolean {
    return this.isPaused
  }

  public setMode(mode: CameraMode) {
    const oldMode = this.mode
    this.mode = mode

    // When switching to free roam, start at current ride position
    if (mode === 'freeroam') {
      const pos = this.curve.getPointAt(this.rideT)
      this.freeRoamPosition.copy(pos)
    }

    // Release pointer lock when switching to ride mode
    if (mode === 'ride' && oldMode === 'freeroam') {
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
    }
  }

  public getMode(): CameraMode {
    return this.mode
  }

  public toggleMode(): CameraMode {
    this.setMode(this.mode === 'ride' ? 'freeroam' : 'ride')
    return this.mode
  }

  public jump() {
    // Only allow jumping in free roam mode and when on ground
    if (this.mode === 'freeroam' && !this.isJumping) {
      this.isJumping = true
      this.jumpVelocity = this.jumpSpeed
    }
  }

  public isSprint(): boolean {
    return this.isSprinting && this.mode === 'freeroam'
  }
}
