// Inscryption Shader System
// Main exports for the post-processing shader system

export { InscryptionShader } from './InscryptionShader';
export { ShaderManager, type ShaderManagerCallbacks } from './ShaderManager';
export type { InscryptionShaderUniforms } from './InscryptionShader';
export type { ShaderConfig } from './ShaderManager';
export { 
  INSCRYPTION_SHADER_DEFAULTS, 
  SHADER_QUALITY_PRESETS, 
  DEVELOPMENT_PRESETS,
  getQualityPresetForPerformance,
  validateShaderConfig 
} from './InscryptionShaderConfig';
export { ShaderDebugUI, type ShaderDebugCallbacks } from './ShaderDebugUI';
export { ShaderPerformanceMonitor, type PerformanceMetrics, type PerformanceCallbacks } from './ShaderPerformanceMonitor';