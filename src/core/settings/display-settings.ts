/**
 * Display and accessibility settings (M7)
 * Graphics quality, interface size, high contrast, reduced motion and touch controls. Stored in
 * the browser so they survive reloads, and tolerant of anything odd found there.
 */

import type { QualitySetting } from '@systems/performance'

export type TouchSetting = 'auto' | 'on' | 'off'

export interface DisplaySettings {
  quality: QualitySetting
  /** Interface scale: one of `UI_SCALES`. */
  uiScale: number
  highContrast: boolean
  /** Fewer animations, no film grain or flicker. */
  reducedMotion: boolean
  touch: TouchSetting
}

export const UI_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const
export const STORAGE_KEY = 'pp.display-settings'

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  quality: 'auto',
  uiScale: 1,
  highContrast: false,
  reducedMotion: false,
  touch: 'auto',
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const QUALITIES: readonly QualitySetting[] = ['auto', 'low', 'medium', 'high']
const TOUCH: readonly TouchSetting[] = ['auto', 'on', 'off']

/** Clean up whatever was stored: keep what is valid, fall back to the defaults for the rest. */
export function sanitizeDisplaySettings(
  raw: unknown,
  prefersReducedMotion = false
): DisplaySettings {
  const base: DisplaySettings = {
    ...DEFAULT_DISPLAY_SETTINGS,
    // Respect the operating system's request until the player chooses otherwise.
    reducedMotion: prefersReducedMotion,
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base
  const r = raw as Record<string, unknown>
  return {
    quality: QUALITIES.includes(r.quality as QualitySetting)
      ? (r.quality as QualitySetting)
      : base.quality,
    uiScale: UI_SCALES.includes(r.uiScale as (typeof UI_SCALES)[number])
      ? (r.uiScale as number)
      : base.uiScale,
    highContrast: typeof r.highContrast === 'boolean' ? r.highContrast : base.highContrast,
    reducedMotion: typeof r.reducedMotion === 'boolean' ? r.reducedMotion : base.reducedMotion,
    touch: TOUCH.includes(r.touch as TouchSetting) ? (r.touch as TouchSetting) : base.touch,
  }
}

export function loadDisplaySettings(
  storage: StorageLike | null = safeStorage(),
  prefersReducedMotion = false
): DisplaySettings {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    return sanitizeDisplaySettings(text ? JSON.parse(text) : null, prefersReducedMotion)
  } catch {
    return sanitizeDisplaySettings(null, prefersReducedMotion)
  }
}

export function saveDisplaySettings(
  settings: DisplaySettings,
  storage: StorageLike | null = safeStorage()
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // private mode or a full disk: the settings just do not persist
  }
}

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
