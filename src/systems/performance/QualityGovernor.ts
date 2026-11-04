/**
 * Quality governor (GDD 13.4, M7)
 * Picks a graphics quality level from measured frame times, so a slow device or a heavy park
 * stays playable without the player digging through settings. It steps down quickly when frames
 * are slow, steps back up only after a long stretch of headroom, and waits between steps, so it
 * never flip-flops. Pure: the caller feeds it frame durations and applies the level it returns.
 */

export type QualityLevel = 0 | 1 | 2
export const QUALITY_NAMES = ['low', 'medium', 'high'] as const
export type QualitySetting = 'auto' | (typeof QUALITY_NAMES)[number]

export interface QualityPreset {
  /** Cap on the renderer's pixel ratio (a cheap way to cut fill cost on dense screens). */
  pixelRatio: number
  shadows: boolean
  /** Residents farther than this from the camera are left frozen (metres). */
  residentRange: number
}

export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualityPreset>> = {
  0: { pixelRatio: 1, shadows: false, residentRange: 35 },
  1: { pixelRatio: 1.5, shadows: true, residentRange: 50 },
  2: { pixelRatio: 2, shadows: true, residentRange: 70 },
}

export interface GovernorOptions {
  /** Average fps below this for `slowSeconds` steps the quality down. */
  slowFps: number
  slowSeconds: number
  /** Average fps above this for `fastSeconds` steps it back up. */
  fastFps: number
  fastSeconds: number
  /** Minimum time between any two steps. */
  cooldownSeconds: number
}

export const DEFAULT_GOVERNOR: GovernorOptions = {
  slowFps: 40,
  slowSeconds: 3,
  fastFps: 57,
  fastSeconds: 20,
  cooldownSeconds: 8,
}

export function levelForSetting(setting: QualitySetting, auto: QualityLevel): QualityLevel {
  if (setting === 'auto') return auto
  return QUALITY_NAMES.indexOf(setting) as QualityLevel
}

export class QualityGovernor {
  private level: QualityLevel
  private readonly opts: GovernorOptions
  private ceiling: QualityLevel = 2
  /** Seconds the average has been continuously slow / fast. */
  private slowFor = 0
  private fastFor = 0
  private sinceStep = Number.POSITIVE_INFINITY
  private paused = false

  constructor(start: QualityLevel = 2, options: Partial<GovernorOptions> = {}) {
    this.level = start
    this.opts = { ...DEFAULT_GOVERNOR, ...options }
  }

  public getLevel(): QualityLevel {
    return this.level
  }

  /** The highest level automatic raising may reach (e.g. after the player picks "medium"). */
  public setCeiling(ceiling: QualityLevel): void {
    this.ceiling = ceiling
    if (this.level > ceiling) this.level = ceiling
  }

  /** Jump to a level (a manual choice); resets the timers. */
  public setLevel(level: QualityLevel): void {
    this.level = level
    this.slowFor = 0
    this.fastFor = 0
    this.sinceStep = 0
  }

  /** While paused (a hidden tab, a menu) frames say nothing about performance. */
  public setPaused(paused: boolean): void {
    this.paused = paused
    if (paused) {
      this.slowFor = 0
      this.fastFor = 0
    }
  }

  /**
   * Feed one frame's duration in seconds. Returns the new level if it just changed. Frames longer
   * than a second (a tab that was in the background) are ignored.
   */
  public recordFrame(dtSeconds: number): QualityLevel | null {
    if (this.paused || !Number.isFinite(dtSeconds) || dtSeconds <= 0 || dtSeconds > 1) return null
    this.sinceStep += dtSeconds
    const fps = 1 / dtSeconds

    // Smooth over time rather than frame by frame: count how long we have been on one side.
    if (fps < this.opts.slowFps) {
      this.slowFor += dtSeconds
      this.fastFor = 0
    } else if (fps > this.opts.fastFps) {
      this.fastFor += dtSeconds
      this.slowFor = Math.max(0, this.slowFor - dtSeconds)
    } else {
      // In between: neither streak grows, and a slow streak slowly forgives.
      this.slowFor = Math.max(0, this.slowFor - dtSeconds * 0.5)
      this.fastFor = Math.max(0, this.fastFor - dtSeconds)
    }

    if (this.sinceStep < this.opts.cooldownSeconds) return null

    if (this.slowFor >= this.opts.slowSeconds && this.level > 0) {
      return this.step((this.level - 1) as QualityLevel)
    }
    if (this.fastFor >= this.opts.fastSeconds && this.level < this.ceiling) {
      return this.step((this.level + 1) as QualityLevel)
    }
    return null
  }

  private step(to: QualityLevel): QualityLevel {
    this.level = to
    this.slowFor = 0
    this.fastFor = 0
    this.sinceStep = 0
    return to
  }
}
