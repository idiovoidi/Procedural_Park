/**
 * Shader System Type Definitions
 */

import type * as THREE from 'three'

// Configuration interface for shader parameters
export interface ShaderConfig {
  enabled: boolean
  luminanceThreshold: number // 0.0 - 1.0
  colorSteps: number // 2 - 16
  intensity: number // 0.0 - 2.0
  darknessBias: number // 0.0 - 1.0
  grittiness: number // 0.0 - 1.0
  filmGrainIntensity: number // 0.0 - 2.0
  vignetteStrength: number // 0.0 - 1.0
  // New pixel art and CRT effects
  ditheringIntensity: number // 0.0 - 1.0
  pixelSize: number // 1.0 - 8.0
  crtCurvature: number // 0.0 - 1.0
  crtScanlines: number // 0.0 - 1.0
  crtPhosphor: number // 0.0 - 1.0
}

// Shader uniforms interface
export interface InscryptionShaderUniforms {
  [key: string]: { value: any }
  tDiffuse: { value: THREE.Texture | null }
  luminanceThreshold: { value: number }
  colorSteps: { value: number }
  intensity: { value: number }
  darknessBias: { value: number }
  resolution: { value: THREE.Vector2 }
  time: { value: number }
  grittiness: { value: number }
  filmGrainIntensity: { value: number }
  vignetteStrength: { value: number }
  ditheringIntensity: { value: number }
  pixelSize: { value: number }
  crtCurvature: { value: number }
  crtScanlines: { value: number }
  crtPhosphor: { value: number }
}

// Performance metrics interface
export interface PerformanceMetrics {
  averageFPS: number
  frameTime: number
  gpuTime?: number
  memoryUsage?: number
  lastUpdateTime: number
}

// Performance callbacks interface
export interface PerformanceCallbacks {
  onQualityAdjustment: (newConfig: ShaderConfig, reason: string) => void
  onPerformanceWarning: (message: string, metrics: PerformanceMetrics) => void
}

// Extended callbacks for shader manager
export interface ShaderManagerCallbacks {
  onPerformanceAdjustment?: (config: ShaderConfig, reason: string) => void
  onPerformanceWarning?: (message: string, metrics: PerformanceMetrics) => void
}

// Shader debug UI callbacks
export interface ShaderDebugCallbacks {
  onConfigChange: (config: Partial<ShaderConfig>) => void
  onToggleShader: (enabled: boolean) => void
  onPresetLoad: (preset: ShaderConfig) => void
  onAutoPerformanceToggle?: (enabled: boolean) => void
}
