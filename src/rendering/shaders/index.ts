// Inscryption Shader System
// Main exports for the post-processing shader system

// Export shader filters
export {
  type ChromaticAberrationConfig,
  ChromaticAberrationFilter,
} from './ChromaticAberrationFilter'
export { type CRTConfig, CRTFilter } from './CRTFilter'
export { type FilmGrainConfig, FilmGrainFilter } from './FilmGrainFilter'
export { InscryptionShader } from './InscryptionShader'
export {
  DEVELOPMENT_PRESETS,
  getQualityPresetForPerformance,
  INSCRYPTION_SHADER_DEFAULTS,
  SHADER_QUALITY_PRESETS,
  validateShaderConfig,
} from './InscryptionShaderConfig'
export { ShaderDebugUI } from './ShaderDebugUI'
export { ShaderManager } from './ShaderManager'
export { ShaderPerformanceMonitor } from './ShaderPerformanceMonitor'

// Export types
export type {
  InscryptionShaderUniforms,
  PerformanceCallbacks,
  PerformanceMetrics,
  ShaderConfig,
  ShaderDebugCallbacks,
  ShaderManagerCallbacks,
} from './types'
