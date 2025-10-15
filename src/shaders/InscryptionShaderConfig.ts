import type { ShaderConfig } from './ShaderManager'

/**
 * Default configuration for the Inscryption shader effect
 * These values are tuned to achieve the distinctive Inscryption aesthetic:
 * - Dark areas are aggressively posterized for deep blacks and hard shadows
 * - Bright areas preserve more detail for text readability
 * - Grit effects add film grain, dirt, and vintage camera imperfections
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

  // Grit effects for that aged, mysterious atmosphere
  // Grittiness of 0.6 adds noticeable but not overwhelming dirt and imperfections
  grittiness: 0.6,

  // Film grain intensity of 0.8 creates that old camera/film aesthetic
  // Adds subtle noise that enhances the vintage feel
  filmGrainIntensity: 0.8,

  // Vignette strength of 0.4 creates subtle edge darkening
  // Mimics old camera lenses and focuses attention on center
  vignetteStrength: 0.4,

  // New pixel art and CRT effects
  // Dithering intensity of 0.3 adds subtle pixel art texture without being overwhelming
  ditheringIntensity: 0.3,

  // Pixel size of 1.0 maintains original resolution (increase for more pixelated look)
  pixelSize: 1.0,

  // CRT curvature disabled (set to 0.0)
  crtCurvature: 0.0,

  // CRT scanlines of 0.3 creates subtle horizontal lines like old monitors
  crtScanlines: 0.3,

  // CRT phosphor of 0.4 adds color bleeding and glow effects
  crtPhosphor: 0.4,
}

/**
 * Quality presets for different hardware capabilities
 */
export const SHADER_QUALITY_PRESETS = {
  // High quality for powerful hardware - full effects
  high: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 12,
    intensity: 1.0,
    grittiness: 0.8,
    filmGrainIntensity: 1.0,
    vignetteStrength: 0.5,
    ditheringIntensity: 0.4,
    crtCurvature: 0.0,
    crtScanlines: 0.4,
    crtPhosphor: 0.5,
  },

  // Medium quality for average hardware - balanced effects
  medium: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 8,
    intensity: 0.9,
    grittiness: 0.6,
    filmGrainIntensity: 0.8,
    vignetteStrength: 0.4,
    ditheringIntensity: 0.3,
    crtCurvature: 0.0,
    crtScanlines: 0.3,
    crtPhosphor: 0.4,
  },

  // Low quality for weaker hardware - reduced effects
  low: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 6,
    intensity: 0.8,
    darknessBias: 0.3,
    grittiness: 0.4,
    filmGrainIntensity: 0.5,
    vignetteStrength: 0.3,
    ditheringIntensity: 0.2,
    crtCurvature: 0.0,
    crtScanlines: 0.2,
    crtPhosphor: 0.2,
  },

  // Minimal quality for very weak hardware - minimal effects
  minimal: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 4,
    intensity: 0.6,
    darknessBias: 0.2,
    grittiness: 0.2,
    filmGrainIntensity: 0.3,
    vignetteStrength: 0.2,
    ditheringIntensity: 0.1,
    crtCurvature: 0.0,
    crtScanlines: 0.1,
    crtPhosphor: 0.1,
  },
} as const

/**
 * Development presets for testing different aesthetic variations
 */
export const DEVELOPMENT_PRESETS = {
  // Original Inscryption-style (default)
  inscryption: INSCRYPTION_SHADER_DEFAULTS,

  // More aggressive posterization and heavy grit for dramatic effect
  dramatic: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    luminanceThreshold: 0.4,
    colorSteps: 6,
    darknessBias: 0.6,
    grittiness: 0.9,
    filmGrainIntensity: 1.2,
    vignetteStrength: 0.6,
    ditheringIntensity: 0.5,
    crtCurvature: 0.0,
    crtScanlines: 0.5,
    crtPhosphor: 0.6,
  },

  // Pixel art style with heavy dithering and pixelation
  pixelArt: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 4,
    intensity: 1.0,
    ditheringIntensity: 0.8,
    pixelSize: 3.0,
    grittiness: 0.2,
    filmGrainIntensity: 0.1,
    vignetteStrength: 0.1,
    crtCurvature: 0.0,
    crtScanlines: 0.0,
    crtPhosphor: 0.0,
  },

  // Retro CRT monitor style (no curvature)
  retroCRT: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    colorSteps: 6,
    intensity: 0.9,
    ditheringIntensity: 0.2,
    pixelSize: 1.5,
    crtCurvature: 0.0,
    crtScanlines: 0.7,
    crtPhosphor: 0.8,
    grittiness: 0.4,
    filmGrainIntensity: 0.3,
    vignetteStrength: 0.5,
  },

  // Subtle effect for less stylized look with minimal effects
  subtle: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    luminanceThreshold: 0.2,
    colorSteps: 12,
    intensity: 0.7,
    darknessBias: 0.2,
    grittiness: 0.3,
    filmGrainIntensity: 0.4,
    vignetteStrength: 0.2,
    ditheringIntensity: 0.1,
    crtCurvature: 0.0,
    crtScanlines: 0.1,
    crtPhosphor: 0.2,
  },

  // High contrast with intense effects for testing
  highContrast: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    luminanceThreshold: 0.5,
    colorSteps: 4,
    intensity: 1.0,
    darknessBias: 0.8,
    grittiness: 0.7,
    filmGrainIntensity: 0.9,
    vignetteStrength: 0.5,
    ditheringIntensity: 0.6,
    crtCurvature: 0.0,
    crtScanlines: 0.4,
    crtPhosphor: 0.5,
  },

  // Clean preset with no effects for comparison
  clean: {
    ...INSCRYPTION_SHADER_DEFAULTS,
    grittiness: 0.0,
    filmGrainIntensity: 0.0,
    vignetteStrength: 0.0,
    ditheringIntensity: 0.0,
    crtCurvature: 0.0,
    crtScanlines: 0.0,
    crtPhosphor: 0.0,
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
    luminanceThreshold: Math.max(
      0.0,
      Math.min(1.0, config.luminanceThreshold ?? INSCRYPTION_SHADER_DEFAULTS.luminanceThreshold)
    ),
    colorSteps: Math.max(
      2,
      Math.min(16, Math.floor(config.colorSteps ?? INSCRYPTION_SHADER_DEFAULTS.colorSteps))
    ),
    intensity: Math.max(
      0.0,
      Math.min(2.0, config.intensity ?? INSCRYPTION_SHADER_DEFAULTS.intensity)
    ),
    darknessBias: Math.max(
      0.0,
      Math.min(1.0, config.darknessBias ?? INSCRYPTION_SHADER_DEFAULTS.darknessBias)
    ),
    grittiness: Math.max(
      0.0,
      Math.min(1.0, config.grittiness ?? INSCRYPTION_SHADER_DEFAULTS.grittiness)
    ),
    filmGrainIntensity: Math.max(
      0.0,
      Math.min(2.0, config.filmGrainIntensity ?? INSCRYPTION_SHADER_DEFAULTS.filmGrainIntensity)
    ),
    vignetteStrength: Math.max(
      0.0,
      Math.min(1.0, config.vignetteStrength ?? INSCRYPTION_SHADER_DEFAULTS.vignetteStrength)
    ),
    ditheringIntensity: Math.max(
      0.0,
      Math.min(1.0, config.ditheringIntensity ?? INSCRYPTION_SHADER_DEFAULTS.ditheringIntensity)
    ),
    pixelSize: Math.max(
      1.0,
      Math.min(8.0, config.pixelSize ?? INSCRYPTION_SHADER_DEFAULTS.pixelSize)
    ),
    crtCurvature: Math.max(
      0.0,
      Math.min(1.0, config.crtCurvature ?? INSCRYPTION_SHADER_DEFAULTS.crtCurvature)
    ),
    crtScanlines: Math.max(
      0.0,
      Math.min(1.0, config.crtScanlines ?? INSCRYPTION_SHADER_DEFAULTS.crtScanlines)
    ),
    crtPhosphor: Math.max(
      0.0,
      Math.min(1.0, config.crtPhosphor ?? INSCRYPTION_SHADER_DEFAULTS.crtPhosphor)
    ),
  }
}
