/**
 * Performance monitoring system for visual effects
 * Implements FPS tracking, performance impact measurement, and automatic quality adjustment
 */

export interface PerformanceMetrics {
  fps: number
  averageFPS: number
  frameTime: number
  averageFrameTime: number
  effectImpact: Map<string, number>
  memoryUsage: number
  gpuMemoryUsage?: number
}

export interface PerformanceThresholds {
  targetFPS: number
  minFPS: number
  maxFrameTime: number
  memoryWarningThreshold: number
  memoryErrorThreshold: number
}

export interface QualityLevel {
  name: string
  lowRes: { enabled: boolean; width: number; height: number }
  chromatic: { enabled: boolean; intensity: number }
  crt: { enabled: boolean; complexity: number }
  grain: { enabled: boolean; intensity: number }
  vignette: { enabled: boolean; intensity: number }
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private thresholds: PerformanceThresholds
  private qualityLevels: QualityLevel[]
  private currentQualityLevel: number = 2 // Start at medium quality
  
  // Performance tracking
  private frameStartTime: number = 0
  private frameTimes: number[] = []
  private fpsHistory: number[] = []
  private effectTimings: Map<string, number[]> = new Map()
  private lastFrameTime: number = performance.now()
  private frameCount: number = 0
  
  // Memory tracking
  private memoryCheckInterval: number = 5000 // Check every 5 seconds
  private lastMemoryCheck: number = 0
  
  // Quality adjustment
  private performanceCheckInterval: number = 2000 // Check every 2 seconds
  private lastPerformanceCheck: number = 0
  private consecutivePoorFrames: number = 0
  private consecutiveGoodFrames: number = 0
  
  // Event callbacks
  private onQualityChange?: (newLevel: QualityLevel) => void
  private onPerformanceWarning?: (metrics: PerformanceMetrics) => void

  constructor(
    thresholds: Partial<PerformanceThresholds> = {},
    onQualityChange?: (newLevel: QualityLevel) => void,
    onPerformanceWarning?: (metrics: PerformanceMetrics) => void
  ) {
    this.thresholds = {
      targetFPS: 60,
      minFPS: 30,
      maxFrameTime: 33.33, // ~30 FPS
      memoryWarningThreshold: 100 * 1024 * 1024, // 100MB
      memoryErrorThreshold: 200 * 1024 * 1024, // 200MB
      ...thresholds
    }
    
    this.onQualityChange = onQualityChange
    this.onPerformanceWarning = onPerformanceWarning
    
    this.initializeMetrics()
    this.initializeQualityLevels()
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      fps: 60,
      averageFPS: 60,
      frameTime: 16.67,
      averageFrameTime: 16.67,
      effectImpact: new Map(),
      memoryUsage: 0,
      gpuMemoryUsage: undefined
    }
  }

  /**
   * Initialize quality levels for automatic adjustment
   */
  private initializeQualityLevels(): void {
    this.qualityLevels = [
      // Low quality - maximum performance
      {
        name: 'low',
        lowRes: { enabled: true, width: 320, height: 180 },
        chromatic: { enabled: false, intensity: 0 },
        crt: { enabled: false, complexity: 0 },
        grain: { enabled: false, intensity: 0 },
        vignette: { enabled: false, intensity: 0 }
      },
      // Medium-Low quality
      {
        name: 'medium-low',
        lowRes: { enabled: true, width: 480, height: 270 },
        chromatic: { enabled: false, intensity: 0 },
        crt: { enabled: true, complexity: 1 }, // Basic scanlines only
        grain: { enabled: true, intensity: 0.02 },
        vignette: { enabled: false, intensity: 0 }
      },
      // Medium quality - balanced
      {
        name: 'medium',
        lowRes: { enabled: true, width: 640, height: 360 },
        chromatic: { enabled: true, intensity: 0.001 },
        crt: { enabled: true, complexity: 2 }, // Scanlines + basic curvature
        grain: { enabled: true, intensity: 0.05 },
        vignette: { enabled: true, intensity: 0.2 }
      },
      // High quality - full effects
      {
        name: 'high',
        lowRes: { enabled: false, width: 1920, height: 1080 },
        chromatic: { enabled: true, intensity: 0.002 },
        crt: { enabled: true, complexity: 3 }, // All CRT effects
        grain: { enabled: true, intensity: 0.08 },
        vignette: { enabled: true, intensity: 0.4 }
      }
    ]
  }

  /**
   * Start frame timing measurement
   */
  public startFrame(): void {
    this.frameStartTime = performance.now()
  }

  /**
   * End frame timing and update metrics
   */
  public endFrame(): void {
    const currentTime = performance.now()
    const frameTime = currentTime - this.frameStartTime
    const deltaTime = currentTime - this.lastFrameTime
    
    // Update frame timing
    this.updateFrameMetrics(frameTime, deltaTime)
    
    // Update memory usage periodically
    this.updateMemoryMetrics(currentTime)
    
    // Check for performance issues and adjust quality
    this.checkPerformanceAndAdjustQuality(currentTime)
    
    this.lastFrameTime = currentTime
    this.frameCount++
  }

  /**
   * Start timing for a specific effect
   */
  public startEffectTiming(effectName: string): void {
    if (!this.effectTimings.has(effectName)) {
      this.effectTimings.set(effectName, [])
    }
    
    // Store start time in a temporary property
    (this as any)[`${effectName}_startTime`] = performance.now()
  }

  /**
   * End timing for a specific effect and record impact
   */
  public endEffectTiming(effectName: string): void {
    const startTime = (this as any)[`${effectName}_startTime`]
    if (startTime === undefined) {
      console.warn(`No start time recorded for effect: ${effectName}`)
      return
    }
    
    const effectTime = performance.now() - startTime
    const timings = this.effectTimings.get(effectName)!
    
    // Keep only last 60 measurements for rolling average
    timings.push(effectTime)
    if (timings.length > 60) {
      timings.shift()
    }
    
    // Calculate average impact
    const averageImpact = timings.reduce((sum, time) => sum + time, 0) / timings.length
    this.metrics.effectImpact.set(effectName, averageImpact)
    
    // Clean up temporary property
    delete (this as any)[`${effectName}_startTime`]
  }

  /**
   * Update frame timing metrics
   */
  private updateFrameMetrics(frameTime: number, deltaTime: number): void {
    // Update current metrics
    this.metrics.frameTime = frameTime
    this.metrics.fps = deltaTime > 0 ? 1000 / deltaTime : 60
    
    // Update rolling averages
    this.frameTimes.push(frameTime)
    this.fpsHistory.push(this.metrics.fps)
    
    // Keep only last 60 measurements
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift()
    }
    
    // Calculate averages
    this.metrics.averageFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
    this.metrics.averageFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(currentTime: number): void {
    if (currentTime - this.lastMemoryCheck < this.memoryCheckInterval) {
      return
    }
    
    this.lastMemoryCheck = currentTime
    
    // Get memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      this.metrics.memoryUsage = memInfo.usedJSHeapSize || 0
    }
    
    // Check for memory warnings
    if (this.metrics.memoryUsage > this.thresholds.memoryWarningThreshold) {
      console.warn(`High memory usage detected: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`)
      
      if (this.onPerformanceWarning) {
        this.onPerformanceWarning(this.metrics)
      }
    }
  }

  /**
   * Check performance and automatically adjust quality if needed
   */
  private checkPerformanceAndAdjustQuality(currentTime: number): void {
    if (currentTime - this.lastPerformanceCheck < this.performanceCheckInterval) {
      return
    }
    
    this.lastPerformanceCheck = currentTime
    
    const isPoorPerformance = this.metrics.averageFPS < this.thresholds.minFPS || 
                             this.metrics.averageFrameTime > this.thresholds.maxFrameTime
    
    const isGoodPerformance = this.metrics.averageFPS > this.thresholds.targetFPS * 0.9 &&
                             this.metrics.averageFrameTime < this.thresholds.maxFrameTime * 0.8
    
    if (isPoorPerformance) {
      this.consecutivePoorFrames++
      this.consecutiveGoodFrames = 0
      
      // Reduce quality after 3 consecutive poor performance checks
      if (this.consecutivePoorFrames >= 3 && this.currentQualityLevel > 0) {
        this.adjustQuality(this.currentQualityLevel - 1)
        this.consecutivePoorFrames = 0
      }
    } else if (isGoodPerformance) {
      this.consecutiveGoodFrames++
      this.consecutivePoorFrames = 0
      
      // Increase quality after 5 consecutive good performance checks
      if (this.consecutiveGoodFrames >= 5 && this.currentQualityLevel < this.qualityLevels.length - 1) {
        this.adjustQuality(this.currentQualityLevel + 1)
        this.consecutiveGoodFrames = 0
      }
    } else {
      // Reset counters for neutral performance
      this.consecutivePoorFrames = 0
      this.consecutiveGoodFrames = 0
    }
  }

  /**
   * Adjust quality level
   */
  private adjustQuality(newLevel: number): void {
    if (newLevel < 0 || newLevel >= this.qualityLevels.length) {
      return
    }
    
    const oldLevel = this.currentQualityLevel
    this.currentQualityLevel = newLevel
    
    const qualityLevel = this.qualityLevels[newLevel]
    
    console.log(`Performance: Adjusting quality from ${this.qualityLevels[oldLevel].name} to ${qualityLevel.name}`)
    console.log(`Current FPS: ${this.metrics.averageFPS.toFixed(1)}, Frame Time: ${this.metrics.averageFrameTime.toFixed(2)}ms`)
    
    if (this.onQualityChange) {
      this.onQualityChange(qualityLevel)
    }
  }

  /**
   * Manually set quality level
   */
  public setQualityLevel(level: number): void {
    if (level < 0 || level >= this.qualityLevels.length) {
      console.warn(`Invalid quality level: ${level}. Must be between 0 and ${this.qualityLevels.length - 1}`)
      return
    }
    
    this.currentQualityLevel = level
    const qualityLevel = this.qualityLevels[level]
    
    console.log(`Manually setting quality to: ${qualityLevel.name}`)
    
    if (this.onQualityChange) {
      this.onQualityChange(qualityLevel)
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get current quality level
   */
  public getCurrentQualityLevel(): QualityLevel {
    return { ...this.qualityLevels[this.currentQualityLevel] }
  }

  /**
   * Get all available quality levels
   */
  public getQualityLevels(): QualityLevel[] {
    return this.qualityLevels.map(level => ({ ...level }))
  }

  /**
   * Get performance impact for a specific effect
   */
  public getEffectImpact(effectName: string): number {
    return this.metrics.effectImpact.get(effectName) || 0
  }

  /**
   * Get all effect impacts
   */
  public getAllEffectImpacts(): Map<string, number> {
    return new Map(this.metrics.effectImpact)
  }

  /**
   * Check if performance is currently poor
   */
  public isPoorPerformance(): boolean {
    return this.metrics.averageFPS < this.thresholds.minFPS || 
           this.metrics.averageFrameTime > this.thresholds.maxFrameTime
  }

  /**
   * Check if memory usage is high
   */
  public isHighMemoryUsage(): boolean {
    return this.metrics.memoryUsage > this.thresholds.memoryWarningThreshold
  }

  /**
   * Reset performance metrics
   */
  public reset(): void {
    this.frameTimes = []
    this.fpsHistory = []
    this.effectTimings.clear()
    this.consecutivePoorFrames = 0
    this.consecutiveGoodFrames = 0
    this.initializeMetrics()
  }

  /**
   * Get performance summary as a formatted string
   */
  public getPerformanceSummary(): string {
    const metrics = this.metrics
    const quality = this.qualityLevels[this.currentQualityLevel]
    
    let summary = `Performance Summary:\n`
    summary += `  Quality Level: ${quality.name}\n`
    summary += `  FPS: ${metrics.fps.toFixed(1)} (avg: ${metrics.averageFPS.toFixed(1)})\n`
    summary += `  Frame Time: ${metrics.frameTime.toFixed(2)}ms (avg: ${metrics.averageFrameTime.toFixed(2)}ms)\n`
    summary += `  Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB\n`
    
    if (metrics.effectImpact.size > 0) {
      summary += `  Effect Impact:\n`
      for (const [effect, impact] of metrics.effectImpact) {
        summary += `    ${effect}: ${impact.toFixed(2)}ms\n`
      }
    }
    
    return summary
  }

  /**
   * Dispose of the performance monitor
   */
  public dispose(): void {
    this.frameTimes = []
    this.fpsHistory = []
    this.effectTimings.clear()
    this.onQualityChange = undefined
    this.onPerformanceWarning = undefined
  }
}