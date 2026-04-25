/**
 * Common shared types used across the application
 */

/**
 * Generic callback type
 */
export type Callback = () => void

/**
 * Generic callback with parameter
 */
export type CallbackWithParam<T> = (param: T) => void

/**
 * Common UI callback types
 */
export interface UICallbacks {
  onHover?: Callback
  onClick?: Callback
}

/**
 * Random number generator function type
 */
export type Random = () => number

/**
 * Settings UI callback types
 */
export interface SettingsCallbacks {
  onRideSpeedChange?: (speed: number) => void
  onClearGallery?: () => void
  onDayNightToggle?: (mode: 'day' | 'night') => void
  onShaderConfigChange?: (config: unknown) => void
  onShaderToggle?: (enabled: boolean) => void
  onShaderPresetLoad?: (preset: unknown) => void
  onAutoPerformanceToggle?: (enabled: boolean) => void
}
