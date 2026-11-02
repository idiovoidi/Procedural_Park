/**
 * SimClock
 * Fixed-step simulation clock for the park economy.
 *
 * Rendering runs at whatever frame rate the device manages; the economy must not. The
 * clock converts real frame time into whole simulation ticks, so the same number of ticks
 * always produces the same park, whether they arrive as 60 small frames, one big frame, or
 * an offline catch-up. It has no dependency on WebGL or the DOM, so it runs in unit tests.
 */

import { GAME_CONFIG } from '@core/constants'
import { log } from '@core/utils'

const { ECONOMY } = GAME_CONFIG

/** Called once per simulation tick. `tick` is the new total tick count (1-based). */
export type TickListener = (tick: number, stepSeconds: number) => void

/** Everything needed to restore the clock from a save. */
export interface SimClockState {
  tick: number
  /** Real seconds (already scaled by speed) not yet turned into a tick. */
  accumulator: number
}

/** Guards against float drift (ten 0.1 s frames sum to 0.9999999...). */
const EPSILON = 1e-9

export class SimClock {
  private tickCount = 0
  private accumulator = 0
  private speed = 1
  private readonly listeners = new Set<TickListener>()
  private readonly stepSeconds: number
  private readonly maxStepsPerAdvance: number

  constructor(
    stepSeconds: number = ECONOMY.TICK_SECONDS,
    maxStepsPerAdvance: number = ECONOMY.MAX_STEPS_PER_FRAME
  ) {
    if (!(stepSeconds > 0)) throw new RangeError('SimClock step must be positive')
    if (!(maxStepsPerAdvance >= 1)) throw new RangeError('SimClock max steps must be at least 1')
    this.stepSeconds = stepSeconds
    this.maxStepsPerAdvance = maxStepsPerAdvance
  }

  /** Total ticks simulated since the park was created. */
  public getTick(): number {
    return this.tickCount
  }

  /** Total simulated seconds. */
  public getElapsedSeconds(): number {
    return this.tickCount * this.stepSeconds
  }

  public getStepSeconds(): number {
    return this.stepSeconds
  }

  public getSpeed(): number {
    return this.speed
  }

  /** Set the time scale: 0 pauses the economy, 1 is real time, up to the configured maximum. */
  public setSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return
    this.speed = Math.min(Math.max(speed, 0), ECONOMY.MAX_SPEED)
  }

  /** Register a per-tick callback. Returns a function that unregisters it. */
  public onTick(listener: TickListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Advance by real frame time (seconds). Returns how many ticks ran.
   * Time beyond the per-call step cap is dropped rather than queued, so an unexpectedly
   * large delta can't make one frame run thousands of ticks. The game loop uses
   * `advanceRealTime` instead, which turns long gaps into deliberate catch-up.
   */
  public advance(deltaSeconds: number): number {
    if (this.speed === 0 || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0

    this.accumulator += deltaSeconds * this.speed

    let steps = 0
    while (this.accumulator + EPSILON >= this.stepSeconds && steps < this.maxStepsPerAdvance) {
      this.accumulator -= this.stepSeconds
      this.runTick()
      steps++
    }

    // Anything still owed beyond the cap is discarded; keep only the partial step.
    if (this.accumulator + EPSILON >= this.stepSeconds) {
      this.accumulator %= this.stepSeconds
    }
    if (this.accumulator < 0) this.accumulator = 0

    return steps
  }

  /**
   * Advance by real elapsed wall-clock time, as measured by the game loop *before* any
   * frame-time cap. A normal frame behaves like `advance`. A long gap (a background tab,
   * a sleeping laptop) is simulated as catch-up instead of dropped, up to the offline cap,
   * so the economy keeps pace with real time on slow devices and after interruptions.
   * Returns how many ticks ran.
   */
  public advanceRealTime(deltaSeconds: number): number {
    if (this.speed === 0 || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0

    const scaled = deltaSeconds * this.speed
    const frameLimit = this.maxStepsPerAdvance * this.stepSeconds
    if (this.accumulator + scaled <= frameLimit) {
      return this.advance(deltaSeconds)
    }

    const total = Math.min(this.accumulator + scaled, ECONOMY.OFFLINE_CAP_SECONDS)
    const ticks = Math.floor((total + EPSILON) / this.stepSeconds)
    for (let i = 0; i < ticks; i++) {
      this.runTick()
    }
    this.accumulator = Math.max(0, total - ticks * this.stepSeconds)
    return ticks
  }

  /**
   * Simulate a span of time in one go (offline catch-up, or a debug skip). The span is
   * clamped to `maxSeconds`, and only whole ticks run. Returns how many ticks ran.
   */
  public fastForward(seconds: number, maxSeconds: number = ECONOMY.OFFLINE_CAP_SECONDS): number {
    if (!Number.isFinite(seconds) || seconds <= 0) return 0

    const ticks = Math.floor((Math.min(seconds, maxSeconds) + EPSILON) / this.stepSeconds)
    for (let i = 0; i < ticks; i++) {
      this.runTick()
    }
    return ticks
  }

  /** Snapshot for saving. */
  public getState(): SimClockState {
    return { tick: this.tickCount, accumulator: this.accumulator }
  }

  /** Restore from a save. Invalid values are ignored so a corrupt save can't wedge the clock. */
  public restore(state: Partial<SimClockState> | null | undefined): void {
    const tick = state?.tick
    const accumulator = state?.accumulator
    this.tickCount = Number.isInteger(tick) && (tick as number) >= 0 ? (tick as number) : 0
    this.accumulator =
      typeof accumulator === 'number' && Number.isFinite(accumulator) && accumulator >= 0
        ? Math.min(accumulator, this.stepSeconds)
        : 0
  }

  private runTick(): void {
    this.tickCount++
    for (const listener of this.listeners) {
      try {
        listener(this.tickCount, this.stepSeconds)
      } catch (error) {
        // One broken system must not stop the economy (or, via the game loop, the whole game).
        log.error('SimClock listener failed', error)
      }
    }
  }
}
