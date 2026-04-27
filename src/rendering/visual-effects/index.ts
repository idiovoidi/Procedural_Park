// Export all visual effects for easy importing

export {
  type ChromaticAberrationConfig,
  ChromaticAberrationFilter,
} from '../shaders/ChromaticAberrationFilter'
export { type CRTConfig, CRTFilter } from '../shaders/CRTFilter'
export { type FilmGrainConfig, FilmGrainFilter } from '../shaders/FilmGrainFilter'
export { BaseVisualEffect } from './BaseVisualEffect'
export { ErrorHandler, type ErrorReport, type FallbackConfig } from './ErrorHandler'
export { type LowResConfig, LowResolutionRenderer } from './LowResolutionRenderer'
export {
  type PerformanceMetrics,
  PerformanceMonitor,
  type PerformanceThresholds,
  type QualityLevel,
} from './PerformanceMonitor'
export {
  type DeviceCapabilities,
  type MemoryUsage,
  PerformanceOptimizer,
} from './PerformanceOptimizer'
export { type EffectsConfig, VisualEffectsManager } from './VisualEffectsManager'
