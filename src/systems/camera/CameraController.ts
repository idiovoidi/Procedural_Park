import { HALF_PI } from '@core/constants'
import { getPooledVector3, memoizedCos, memoizedSin, releaseVector3 } from '@core/utils'
import type { InputManager } from '@systems/input'
import {
  easeFactor,
  forwardDistance,
  nearestTrackT,
  STATION_APPROACH,
  STATION_DEPART,
  STATION_DWELL_SECONDS,
  STATION_STOP_EPS,
  type StationDef,
} from '@systems/track/track-path'
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
  private readonly eyeHeight = 1.6
  private groundAt: ((x: number, z: number) => number) | null = null

  // Station stops along the track
  private stations: readonly StationDef[] = []
  private dwellRemaining = 0
  /** Station the tram is stopped at or has just left; it is not approached again. */
  private currentStation = -1
  private onStationArrive: ((station: StationDef) => void) | null = null

  private inputManager: InputManager | null = null
  private canvas: HTMLCanvasElement | null = null

  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }

  private handleMouseDown = () => {
    if (this.mode === 'ride') {
      this.isDragging = true
    }
  }

  private handleMouseUp = () => {
    this.isDragging = false
  }

  private handleMouseLeave = () => {
    this.isDragging = false
  }

  private handleClick = () => {
    if (this.mode === 'freeroam' && this.inputManager && !this.inputManager.isPointerLocked()) {
      this.inputManager.requestPointerLock()
    }
  }

  constructor(curve: THREE.CatmullRomCurve3, inputManager?: InputManager) {
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600)
    this.camera.position.set(0, 1.6, 5)
    this.curve = curve

    if (inputManager) {
      this.setInputManager(inputManager)
    }

    this.setupEventListeners()
  }

  /** Lets free roam follow the terrain instead of a flat plane. */
  public setGroundHeightSampler(sampler: (x: number, z: number) => number) {
    this.groundAt = sampler
  }

  /** Stops the tram halts at while riding; `onArrive` fires each time it pulls in. */
  public setStations(stations: readonly StationDef[], onArrive?: (station: StationDef) => void) {
    this.stations = stations
    this.onStationArrive = onArrive ?? null
  }

  /** The station the tram is currently stopped at, or null while moving. */
  public getDwellingStation(): StationDef | null {
    return this.dwellRemaining > 0 ? (this.stations[this.currentStation] ?? null) : null
  }

  public setInputManager(inputManager: InputManager) {
    this.inputManager = inputManager
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.handleResize)
  }

  public setupMouseControls(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    // Set canvas in input manager for pointer lock
    if (this.inputManager) {
      this.inputManager.setCanvas(canvas)
    }

    // Ride mode: drag to look
    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mouseup', this.handleMouseUp)
    canvas.addEventListener('mouseleave', this.handleMouseLeave)

    // Click to enter pointer lock in free roam mode
    canvas.addEventListener('click', this.handleClick)
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
      this.advanceRide(dtSeconds)
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

  /** Moves the tram along the loop, easing to a halt at each station and pulling away again. */
  private advanceRide(dtSeconds: number) {
    if (this.dwellRemaining > 0) {
      this.dwellRemaining = Math.max(0, this.dwellRemaining - dtSeconds)
      return
    }

    // Forget the last station once we are clear of it
    const last = this.stations[this.currentStation]
    if (last && forwardDistance(last.t, this.rideT) >= STATION_DEPART) this.currentStation = -1

    let factor = 1
    let arrivingAt = -1
    let arrivingDist = 1
    this.stations.forEach((station, i) => {
      const behind = forwardDistance(station.t, this.rideT)
      if (behind < STATION_DEPART) factor = Math.min(factor, easeFactor(behind, STATION_DEPART))
      if (i === this.currentStation) return
      const ahead = forwardDistance(this.rideT, station.t)
      if (ahead < STATION_APPROACH) {
        factor = Math.min(factor, easeFactor(ahead, STATION_APPROACH))
        if (ahead < arrivingDist) {
          arrivingDist = ahead
          arrivingAt = i
        }
      }
    })

    const step = this.rideSpeed * factor * dtSeconds
    if (arrivingAt >= 0 && (arrivingDist < STATION_STOP_EPS || step >= arrivingDist)) {
      const station = this.stations[arrivingAt] as StationDef
      this.rideT = station.t
      this.currentStation = arrivingAt
      this.dwellRemaining = STATION_DWELL_SECONDS
      this.onStationArrive?.(station)
      return
    }

    this.rideT = (this.rideT + step) % 1
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

    // Stand on the terrain
    this.groundHeight = this.sampleGround(this.freeRoamPosition.x, this.freeRoamPosition.z)
    if (!this.isJumping) this.freeRoamPosition.y = this.groundHeight

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

  private sampleGround(x: number, z: number): number {
    return (this.groundAt ? this.groundAt(x, z) : 0) + this.eyeHeight
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

    // Hop off beside the track, on the platform side
    if (mode === 'freeroam' && oldMode === 'ride') {
      const pos = this.curve.getPointAt(this.rideT)
      const tangent = this.curve.getTangentAt(this.rideT)
      const right = new THREE.Vector3()
        .crossVectors(tangent, new THREE.Vector3(0, 1, 0))
        .normalize()
      pos.addScaledVector(right, 3)
      pos.y = this.sampleGround(pos.x, pos.z)
      this.freeRoamPosition.copy(pos)
      this.isJumping = false
      this.jumpVelocity = 0
    }

    // Climb back aboard at the nearest point of the track
    if (mode === 'ride' && oldMode === 'freeroam') {
      this.rideT = nearestTrackT(this.curve, this.freeRoamPosition)
      this.dwellRemaining = 0
      this.currentStation = -1
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

  public reset(): void {
    this.rideT = 0
    this.dwellRemaining = 0
    this.currentStation = -1
    this.yaw = 0
    this.pitch = 0
    this.yawTarget = 0
    this.pitchTarget = 0
    this.isDragging = false
    this.isJumping = false
    this.jumpVelocity = 0
    this.setMode('ride')
    const startPoint = this.curve.getPointAt(0)
    this.camera.position.copy(startPoint)
    this.camera.position.y += 1.6
    this.freeRoamPosition.copy(this.camera.position)
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize)

    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown)
      this.canvas.removeEventListener('mouseup', this.handleMouseUp)
      this.canvas.removeEventListener('mouseleave', this.handleMouseLeave)
      this.canvas.removeEventListener('click', this.handleClick)
      this.canvas = null
    }

    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
  }
}
