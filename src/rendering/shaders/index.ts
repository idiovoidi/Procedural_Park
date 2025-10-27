// Inscryption Shader System
// Main exports for the post-processing shader system

export { InscryptionShader } from './InscryptionShader'
export { ShaderManager } from './ShaderManager'
export { ShaderDebugUI } from './ShaderDebugUI'
export { ShaderPerformanceMonitor } from './ShaderPerformanceMonitor'
export { 
  INSCRYPTION_SHADER_DEFAULTS, 
  SHADER_QUALITY_PRESETS, 
  DEVELOPMENT_PRESETS,
  getQualityPresetForPerformance,
  validateShaderConfig 
} from './InscryptionShaderConfig'

// Export shader filters
export { ChromaticAberrationFilter, type ChromaticAberrationConfig } from './ChromaticAberrationFilter'
export { FilmGrainFilter, type FilmGrainConfig } from './FilmGrainFilter'
export { CRTFilter, type CRTConfig } from './CRTFilter'

// Export types
export type {
  ShaderConfig,
  InscryptionShaderUniforms,
  PerformanceMetrics,
  PerformanceCallbacks,
  ShaderManagerCallbacks,
  ShaderDebugCallbacks,
} from './types'
