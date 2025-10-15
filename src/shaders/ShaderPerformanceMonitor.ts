import type { ShaderConfig } from './ShaderManager'
import { SHADER_QUALITY_PRESETS } from './InscryptionShaderConfig'

export interface PerformanceMetrics {
  averageFPS: number
  frameTime: number
  gpuTime?: number
  memoryUsage?: number
  lastUpdateTime: number
}

export interface PerformanceCallbacks {
  onQualityAdjustment: (newConfig: ShaderConfig, reason: string) => void
  onPerformanceWarning: (message: string, metrics: PerformanceMetrics) => void
}

export class ShaderPerformanceMonitor {
  private callbacks: PerformanceCallbacks
  private frameHistory: number[] = []
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private startTime: number = performance.now()
  private isMonitoring: boolean = false
  private adjustmentCooldown: number = 0
  private currentQualityLevel: keyof typeof SHADER_QUALITY_PRESETS = 'high'
  
  // Performance thresholds
  private readonly TARGET_FPS = 60
  private readonly MIN_ACCEPTABLE_FPS = 30
  private readonly PERFORMANCE_CHECK_INTERVAL = 2000 // 2 seconds
  private readonly ADJUSTMENT_COOLDOWN = 5000 // 5 seconds between adjustments
  private readonly FRAME_HISTORY_SIZE = 120 // 2 seconds at 60fps

  constructor(callbacks: PerformanceCallbacks) {
    this.callbacks = callbacks
  }

  public startMonitoring(): void {
    this.isMonitoring = true
    this.frameHistory = []
    this.frameCount = 0
    this.startTime = performance.now()
    this.lastFrameTime = this.startTime
  }

  public stopMonitoring(): void {
    this.isMonitoring = false
  }

  public recordFrame(): void {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    const frameTime = currentTime - this.lastFrameTime
    
    // Record frame time
    this.frameHistory.push(frameTime)
    
    // Keep history size manageable
    if (this.frameHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameHistory.shift()
    }
    
    this.frameCount++
    this.lastFrameTime = currentTime
    
    // Check performance periodically
    if (currentTime - this.startTime > this.PERFORMANCE_CHECK_INTERVAL) {
      this.checkPerformance()
      this.startTime = currentTime
    }
  }

  private checkPerformance(): void {
    if (this.frameHistory.length < 30) return // Need enough samples
    
    const metrics = this.calculateMetrics()
    
    // Check if we need to adjust quality
    const currentTime = performance.now()
    if (currentTime - this.adjustmentCooldown > this.ADJUSTMENT_COOLDOWN) {
      this.considerQualityAdjustment(metrics)
    }
    
    // Check for performance warnings
    if (metrics.averageFPS < this.MIN_ACCEPTABLE_FPS) {
      this.callbacks.onPerformanceWarning(
        `Low FPS detected: ${metrics.averageFPS.toFixed(1)} fps`,
        metrics
      )
    }
  }

  private calculateMetrics(): PerformanceMetrics {
    const recentFrames = this.frameHistory.slice(-60) // Last 1 second
    const averageFrameTime = recentFrames.reduce((sum, time) => sum + time, 0) / recentFrames.length
    const averageFPS = 1000 / averageFrameTime
    
    return {
      averageFPS,
      frameTime: averageFrameTime,
      lastUpdateTime: performance.now(),
      // GPU time and memory usage would require WebGL extensions
      // which may not be available on all devices
    }
  }

  private considerQualityAdjustment(metrics: PerformanceMetrics): void {
    const targetQuality = this.getOptimalQualityLevel(metrics.averageFPS)
    
    if (targetQuality !== this.currentQualityLevel) {
      const newConfig = SHADER_QUALITY_PRESETS[targetQuality]
      const reason = this.getAdjustmentReason(metrics.averageFPS, targetQuality)
      
      this.currentQualityLevel = targetQuality
      this.adjustmentCooldown = performance.now()
      
      this.callbacks.onQualityAdjustment(newConfig, reason)
    }
  }

  private getOptimalQualityLevel(averageFPS: number): keyof typeof SHADER_QUALITY_PRESETS {
    // Determine optimal quality based on current performance
    if (averageFPS >= 55) {
      return 'high'
    } else if (averageFPS >= 45) {
      return 'medium'
    } else if (averageFPS >= 30) {
      return 'low'
    } else {
      return 'minimal'
    }
  }

  private getAdjustmentReason(fps: number, quality: string): string {
    if (fps < 30) {
      return `Performance critical (${fps.toFixed(1)} fps) - reducing to ${quality} quality`
    } else if (fps < 45) {
      return `Performance low (${fps.toFixed(1)} fps) - adjusting to ${quality} quality`
    } else if (fps >= 55 && quality === 'high') {
      return `Performance excellent (${fps.toFixed(1)} fps) - enabling high quality`
    } else {
      return `Performance stable (${fps.toFixed(1)} fps) - using ${quality} quality`
    }
  }

  public getCurrentMetrics(): PerformanceMetrics | null {
    if (this.frameHistory.length < 10) return null
    return this.calculateMetrics()
  }

  public getCurrentQualityLevel(): keyof typeof SHADER_QUALITY_PRESETS {
    return this.currentQualityLevel
  }

  public setQualityLevel(quality: keyof typeof SHADER_QUALITY_PRESETS): void {
    this.currentQualityLevel = quality
    this.adjustmentCooldown = performance.now() // Reset cooldown when manually set
  }

  public getPerformanceReport(): string {
    const metrics = this.getCurrentMetrics()
    if (!metrics) return 'Insufficient data for performance report'
    
    const quality = this.currentQualityLevel
    const fpsStatus = metrics.averageFPS >= this.TARGET_FPS ? 'Excellent' : 
                     metrics.averageFPS >= 45 ? 'Good' : 
                     metrics.averageFPS >= 30 ? 'Acceptable' : 'Poor'
    
    return `Performance: ${fpsStatus} (${metrics.averageFPS.toFixed(1)} fps)\n` +
           `Frame Time: ${metrics.frameTime.toFixed(2)}ms\n` +
           `Quality Level: ${quality}\n` +
           `Frames Analyzed: ${this.frameHistory.length}`
  }

  public dispose(): void {
    this.stopMonitoring()
    this.frameHistory = []
  }
}