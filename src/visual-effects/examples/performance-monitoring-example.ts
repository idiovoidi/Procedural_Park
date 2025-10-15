/**
 * Example demonstrating how to use the performance monitoring and optimization features
 * of the visual effects system
 */

import * as THREE from 'three'
import { VisualEffectsManager, type EffectsConfig } from '../VisualEffectsManager'

// Example usage of the performance monitoring system
export function createPerformanceMonitoredVisualEffects(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): VisualEffectsManager {
  
  // Configure effects with reasonable defaults
  const effectsConfig: EffectsConfig = {
    lowRes: {
      enabled: true,
      width: 640,
      height: 360,
      upscaleWidth: 1920,
      upscaleHeight: 1080
    },
    chromatic: {
      enabled: true,
      offset: 0.002,
      direction: [1.0, 0.0],
      radial: false
    },
    crt: {
      enabled: true,
      scanlines: {
        enabled: true,
        intensity: 0.3,
        spacing: 2.0,
        thickness: 0.5
      },
      curvature: {
        enabled: true,
        amount: 0.02,
        corners: 0.3
      },
      phosphor: {
        enabled: true,
        intensity: 0.2,
        persistence: 1.5
      },
      noise: {
        enabled: false,
        intensity: 0.02,
        speed: 1.0
      },
      flicker: {
        enabled: false,
        intensity: 0.05,
        frequency: 2.0
      }
    },
    grain: {
      enabled: true,
      intensity: 0.05,
      animated: true,
      speed: 1.0
    }
  }

  // Configure performance thresholds
  const performanceThresholds = {
    targetFPS: 60,
    minFPS: 30,
    maxFrameTime: 33.33, // ~30 FPS
    memoryWarningThreshold: 100 * 1024 * 1024, // 100MB
    memoryErrorThreshold: 200 * 1024 * 1024 // 200MB
  }

  // Configure fallback options
  const fallbackConfig = {
    enableShaderFallbacks: true,
    enableContextRecovery: true,
    enableGracefulDegradation: true,
    maxRecoveryAttempts: 3,
    recoveryDelay: 1000
  }

  // Create the visual effects manager with monitoring
  const effectsManager = new VisualEffectsManager(
    renderer,
    scene,
    camera,
    effectsConfig,
    performanceThresholds,
    fallbackConfig
  )

  return effectsManager
}

// Example of monitoring performance in a render loop
export function renderWithPerformanceMonitoring(
  effectsManager: VisualEffectsManager,
  deltaTime: number
): void {
  
  // Update time for animated effects
  effectsManager.updateTime(deltaTime)
  
  // Render with automatic performance monitoring
  effectsManager.render()
  
  // Check performance every few seconds
  if (Math.random() < 0.01) { // ~1% chance per frame (roughly every few seconds at 60fps)
    logPerformanceMetrics(effectsManager)
  }
}

// Example of logging performance metrics
function logPerformanceMetrics(effectsManager: VisualEffectsManager): void {
  const metrics = effectsManager.getPerformanceMetrics()
  const deviceCapabilities = effectsManager.getDeviceCapabilities()
  const memoryUsage = effectsManager.getMemoryUsage()
  const healthStatus = effectsManager.getHealthStatus()
  
  console.log('=== Performance Report ===')
  console.log(`FPS: ${metrics.fps.toFixed(1)} (avg: ${metrics.averageFPS.toFixed(1)})`)
  console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms (avg: ${metrics.averageFrameTime.toFixed(2)}ms)`)
  console.log(`Memory Usage: ${(memoryUsage.total / 1024 / 1024).toFixed(1)}MB`)
  
  if (metrics.effectImpact.size > 0) {
    console.log('Effect Performance Impact:')
    for (const [effect, impact] of metrics.effectImpact) {
      console.log(`  ${effect}: ${impact.toFixed(2)}ms`)
    }
  }
  
  console.log(`Device: ${deviceCapabilities.renderer}`)
  console.log(`WebGL Version: ${deviceCapabilities.webglVersion}`)
  console.log(`Max Texture Size: ${deviceCapabilities.maxTextureSize}`)
  console.log(`Low-end Device: ${deviceCapabilities.isLowEndDevice}`)
  console.log(`Mobile Device: ${deviceCapabilities.isMobileDevice}`)
  
  console.log(`Health Status: ${healthStatus.status}`)
  if (healthStatus.issues.length > 0) {
    console.log('Issues:', healthStatus.issues)
  }
  if (healthStatus.recommendations.length > 0) {
    console.log('Recommendations:', healthStatus.recommendations)
  }
  
  console.log('========================')
}

// Example of handling performance warnings
export function setupPerformanceWarningHandling(effectsManager: VisualEffectsManager): void {
  // Monitor for poor performance
  setInterval(() => {
    if (effectsManager.isPoorPerformance()) {
      console.warn('Poor performance detected!')
      
      const recommendations = effectsManager.getPerformanceRecommendations()
      console.log('Performance recommendations:')
      recommendations.forEach(rec => console.log(`  - ${rec}`))
      
      // Optionally adjust quality automatically
      // (Note: The performance monitor already does this automatically,
      // but you can also manually adjust if needed)
    }
    
    if (effectsManager.isHighMemoryUsage()) {
      console.warn('High memory usage detected!')
      
      const memoryUsage = effectsManager.getMemoryUsage()
      console.log(`Memory usage: ${(memoryUsage.total / 1024 / 1024).toFixed(1)}MB`)
    }
    
    if (effectsManager.isWebGLContextLost()) {
      console.error('WebGL context lost! Visual effects will be disabled until recovery.')
    }
    
  }, 5000) // Check every 5 seconds
}

// Example of manual quality adjustment
export function adjustQualityBasedOnPerformance(effectsManager: VisualEffectsManager): void {
  const metrics = effectsManager.getPerformanceMetrics()
  const currentQuality = effectsManager.getCurrentQualityLevel()
  const availableQualities = effectsManager.getQualityLevels()
  
  console.log(`Current quality: ${currentQuality.name}`)
  console.log(`Available qualities: ${availableQualities.map(q => q.name).join(', ')}`)
  
  // Manual quality adjustment based on FPS
  if (metrics.averageFPS < 30) {
    // Find a lower quality level
    const currentIndex = availableQualities.findIndex(q => q.name === currentQuality.name)
    if (currentIndex > 0) {
      effectsManager.setQualityLevel(currentIndex - 1)
      console.log(`Reduced quality to: ${availableQualities[currentIndex - 1].name}`)
    }
  } else if (metrics.averageFPS > 55) {
    // Find a higher quality level
    const currentIndex = availableQualities.findIndex(q => q.name === currentQuality.name)
    if (currentIndex < availableQualities.length - 1) {
      effectsManager.setQualityLevel(currentIndex + 1)
      console.log(`Increased quality to: ${availableQualities[currentIndex + 1].name}`)
    }
  }
}

// Example of error handling
export function handleVisualEffectsErrors(effectsManager: VisualEffectsManager): void {
  const errorHandler = effectsManager.getErrorHandler()
  
  // Set up context loss handling
  errorHandler.onContextLost(() => {
    console.warn('WebGL context lost - pausing visual effects')
    // You might want to show a message to the user or pause the game
  })
  
  errorHandler.onContextRestored(() => {
    console.log('WebGL context restored - resuming visual effects')
    // Resume normal operation
  })
  
  // Periodically check for errors
  setInterval(() => {
    const recentErrors = errorHandler.getRecentErrors()
    const errorStats = errorHandler.getErrorStatistics()
    
    if (recentErrors.length > 0) {
      console.log(`Recent errors: ${recentErrors.length}`)
      console.log(`Recovery rate: ${(errorStats.recoveryRate * 100).toFixed(1)}%`)
      
      // Log the most recent error
      const latestError = recentErrors[recentErrors.length - 1]
      console.log(`Latest error: [${latestError.severity}] ${latestError.message}`)
      
      if (latestError.recovered) {
        console.log(`Recovery strategy: ${latestError.recoveryStrategy}`)
      }
    }
  }, 10000) // Check every 10 seconds
}