import * as THREE from 'three'

export type CameraMode = 'ride' | 'freeroam'

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
  private lastX = 0
  private lastY = 0

  // Free roam controls
  private moveForward = false
  private moveBackward = false
  private moveLeft = false
  private moveRight = false
  private moveSpeed = 5.0
  private freeRoamPosition = new THREE.Vector3(0, 1.6, 5)

  constructor(curve: THREE.CatmullRomCurve3) {
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600)
    this.camera.position.set(0, 1.6, 5)
    this.curve = curve
    this.setupEventListeners()
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })

    window.addEventListener('keydown', (e) => {
      // Arrow keys for ride mode camera control
      if (this.mode === 'ride') {
        if (e.key === 'ArrowLeft') this.yawTarget -= 0.05
        if (e.key === 'ArrowRight') this.yawTarget += 0.05
        if (e.key === 'ArrowUp') this.pitchTarget = Math.min(this.pitchTarget + 0.04, 0.6)
        if (e.key === 'ArrowDown') this.pitchTarget = Math.max(this.pitchTarget - 0.04, -0.6)
        if (e.key.toLowerCase() === 'r') this.rideT = 0
      }

      // WASD for free roam movement
      if (this.mode === 'freeroam') {
        if (e.key.toLowerCase() === 'w') this.moveForward = true
        if (e.key.toLowerCase() === 's') this.moveBackward = true
        if (e.key.toLowerCase() === 'a') this.moveLeft = true
        if (e.key.toLowerCase() === 'd') this.moveRight = true
      }
    })

    window.addEventListener('keyup', (e) => {
      if (this.mode === 'freeroam') {
        if (e.key.toLowerCase() === 'w') this.moveForward = false
        if (e.key.toLowerCase() === 's') this.moveBackward = false
        if (e.key.toLowerCase() === 'a') this.moveLeft = false
        if (e.key.toLowerCase() === 'd') this.moveRight = false
      }
    })
  }

  public setupMouseControls(canvas: HTMLCanvasElement) {
    // Ride mode: drag to look
    canvas.addEventListener('mousedown', (e) => {
      if (this.mode === 'ride') {
        this.isDragging = true
        this.lastX = e.clientX
        this.lastY = e.clientY
      }
    })

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false
    })

    canvas.addEventListener('mousemove', (e) => {
      // Ride mode: drag to look
      if (this.mode === 'ride' && this.isDragging) {
        const dx = e.clientX - this.lastX
        const dy = e.clientY - this.lastY
        this.lastX = e.clientX
        this.lastY = e.clientY
        this.yawTarget += dx * 0.0025
        this.pitchTarget = Math.max(-0.6, Math.min(0.6, this.pitchTarget + dy * 0.002))
      }

      // Free roam mode: pointer lock movement
      if (this.mode === 'freeroam' && document.pointerLockElement === canvas) {
        const dx = e.movementX || 0
        const dy = e.movementY || 0
        this.yawTarget -= dx * 0.002 // Negative for correct left/right
        this.pitchTarget = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, this.pitchTarget - dy * 0.002) // Negative for correct up/down
        )
      }
    })

    // Click to enter pointer lock in free roam mode
    canvas.addEventListener('click', () => {
      if (this.mode === 'freeroam' && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock()
      }
    })

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && this.mode === 'freeroam') {
        // Pointer lock was released
        console.log('Pointer lock released. Click canvas to re-enable first-person controls.')
      }
    })
  }

  public update(dtSeconds: number) {
    if (this.mode === 'ride') {
      this.updateRideMode(dtSeconds)
    } else {
      this.updateFreeRoamMode(dtSeconds)
    }
  }

  private updateRideMode(dtSeconds: number) {
    // Only advance ride position if not paused
    if (!this.isPaused) {
      this.rideT = (this.rideT + this.rideSpeed * dtSeconds) % 1
    }

    const pos = this.curve.getPointAt(this.rideT)
    const tangent = this.curve.getTangentAt(this.rideT)
    const normal = new THREE.Vector3(0, 1, 0)
    const side = new THREE.Vector3().crossVectors(tangent, normal).normalize()

    this.camera.position.copy(pos)
    const lookTarget = new THREE.Vector3().copy(pos).addScaledVector(tangent, 2)

    // Smooth input for stability
    this.yaw += (this.yawTarget - this.yaw) * Math.min(1, 10 * dtSeconds)
    this.pitch += (this.pitchTarget - this.pitch) * Math.min(1, 10 * dtSeconds)

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(normal, this.yaw)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(side, this.pitch)
    lookTarget.sub(pos).applyQuaternion(yawQuat).applyQuaternion(pitchQuat).add(pos)
    this.camera.lookAt(lookTarget)
  }

  private updateFreeRoamMode(dtSeconds: number) {
    // Direct camera control (no smoothing for first-person feel)
    this.yaw = this.yawTarget
    this.pitch = this.pitchTarget

    // Calculate movement direction based on camera yaw (fixed directions)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))

    // Apply WASD movement
    const velocity = new THREE.Vector3()
    if (this.moveForward) velocity.add(forward)
    if (this.moveBackward) velocity.sub(forward)
    if (this.moveLeft) velocity.sub(right)
    if (this.moveRight) velocity.add(right)

    // Normalize and apply speed
    if (velocity.length() > 0) {
      velocity.normalize().multiplyScalar(this.moveSpeed * dtSeconds)
      this.freeRoamPosition.add(velocity)
    }

    // Update camera position and look direction
    this.camera.position.copy(this.freeRoamPosition)

    // Calculate look target (fixed to match movement)
    const lookTarget = new THREE.Vector3()
    lookTarget.x = this.freeRoamPosition.x - Math.sin(this.yaw) * Math.cos(this.pitch)
    lookTarget.y = this.freeRoamPosition.y + Math.sin(this.pitch)
    lookTarget.z = this.freeRoamPosition.z - Math.cos(this.yaw) * Math.cos(this.pitch)

    this.camera.lookAt(lookTarget)
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
}
