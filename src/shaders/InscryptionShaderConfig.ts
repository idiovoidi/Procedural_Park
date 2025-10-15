import type { ShaderConfig } from './ShaderManager'

/**
 * Default configuration for the Inscryption shader effect
 * These values are tuned to achieve the distinctive Inscryption aesthetic:
 * - Dark areas are aggressively posterized for deep blacks and hard shadows
 * - Bright areas preserve more detail for text readability
 * - Overall effect creates a mysterious, atmospheric look
 */
export const INSCRYPTION_SHADER_DEFAULTS: ShaderConfig = {
  // Enable shader by default
  enabled: true,
  
  // Luminance threshold of 0.3 provides optimal balance between dark and bright areas
  // Values below this threshold get aggressive posterization
  // Values above preserve more color gradation for readability
  luminanceThreshold: 0.3,
  
  // 8 color steps provides appropriate posterization level
  // Enough steps to avoid harsh banding while maintaining the stylized look
  colorSteps: 8,
  
  // Full intensity (1.0) applies the effect completely
  // Can be reduced for subtle blending with original colors
  intensity: 1.0,
  
  // Darkness bias of 0.4 enhances low-luminance areas
  // Creates deeper blacks characteristic of Inscryption's aesthetic
  darknessBias: 0.4,
}

/**
 * Quality presets for different hardware capabilities
 */
export const SHADER_QUALITY_PRESETS = {
  // High quality for powerful hardware
  high: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 12,
    intensity: 1.0,
  },
  
  // Medium quality for average hardware
  medium: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 8,
    intensity: 0.9,
  },
  
  // Low quality for weaker hardware or mobile devices
  low: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 6,
    intensity: 0.8,
    darknessBias: 0.3,
  },
  
  // Minimal quality for very weak hardware
  minimal: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 4,
    intensity: 0.6,
    darknessBias: 0.2,
  },
} as const

/**
 * Development presets for testing different aesthetic variations
 */
export const DEVELOPMENT_PRESETS = {
  // Original Inscryption-style (default)
  inscryption: INSCRYPTION_SHADER_DEFAULTS,
  
  // More aggressive posterization for dramatic effect
  dramatic: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    luminanceThreshold: 0.4,
    colorSteps: 6,
    darknessBias: 0.6,
  },
  
  // Subtle effect for less stylized look
  subtle: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    luminanceThreshold: 0.2,
    colorSteps: 12,
    intensity: 0.7,
    darknessBias: 0.2,
  },
  
  // High contrast for testing readability
  highContrast: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    luminanceThreshold: 0.5,
    colorSteps: 4,
    intensity: 1.0,
    darknessBias: 0.8,
  },
} as const

/**
 * Get the appropriate quality preset based on performance metrics
 */
export function getQualityPresetForPerformance(averageFPS: number): ShaderConfig {
  if (averageFPS >= 55) {
    return SHADER_QUALITY_PRESETS.high
  } else if (averageFPS >= 45) {
    return SHADER_QUALITY_PRESETS.medium
  } else if (averageFPS >= 30) {
    return SHADER_QUALITY_PRESETS.low
  } else {
    return SHADER_QUALITY_PRESETS.minimal
  }
}

/**
 * Validate shader configuration parameters
 */
export function validateShaderConfig(config: Partial<ShaderConfig>): ShaderConfig {
  return {
    enabled: config.enabled ?? INSCRYPTION_SHADER_DEFAULTS.enabled,
    luminanceThreshold: Math.max(0.0, Math.min(1.0, config.luminanceThreshold ?? INSCRYPTION_SHADER_DEFAULTS.luminanceThreshold)),
    colorSteps: Math.max(2, Math.min(16, Math.floor(config.colorSteps ?? INSCRYPTION_SHADER_DEFAULTS.colorSteps))),
    intensity: Math.max(0.0, Math.min(2.0, config.intensity ?? INSCRYPTION_SHADER_DEFAULTS.intensity)),
    darknessBias: Math.max(0.0, Math.min(1.0, config.darknessBias ?? INSCRYPTION_SHADER_DEFAULTS.darknessBias)),
  }
}