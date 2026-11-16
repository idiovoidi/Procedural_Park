import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DISPLAY_SETTINGS,
  loadDisplaySettings,
  STORAGE_KEY,
  sanitizeDisplaySettings,
  saveDisplaySettings,
} from './display-settings'

const memory = (initial?: string) => {
  const data = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]])
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  }
}

describe('display settings', () => {
  it('start from the defaults, honouring the system reduced-motion preference', () => {
    expect(loadDisplaySettings(memory(), false)).toEqual(DEFAULT_DISPLAY_SETTINGS)
    expect(loadDisplaySettings(memory(), true).reducedMotion).toBe(true)
    // A saved choice beats the system preference.
    const stored = memory(JSON.stringify({ reducedMotion: false }))
    expect(loadDisplaySettings(stored, true).reducedMotion).toBe(false)
  })

  it('round-trip through storage', () => {
    const storage = memory()
    const settings = {
      quality: 'low',
      uiScale: 1.3,
      highContrast: true,
      reducedMotion: true,
      touch: 'on',
    } as const
    saveDisplaySettings(settings, storage)
    expect(loadDisplaySettings(storage)).toEqual(settings)
  })

  it('keep the valid parts of damaged data and drop the rest', () => {
    const mixed = sanitizeDisplaySettings({
      quality: 'ultra',
      uiScale: 2.5,
      highContrast: 'yes',
      touch: 'on',
    })
    expect(mixed).toEqual({ ...DEFAULT_DISPLAY_SETTINGS, touch: 'on' })
    for (const junk of [null, 5, 'text', [1, 2], undefined]) {
      expect(sanitizeDisplaySettings(junk)).toEqual(DEFAULT_DISPLAY_SETTINGS)
    }
  })

  it('never throw: bad JSON, missing or failing storage', () => {
    expect(loadDisplaySettings(memory('{not json'))).toEqual(DEFAULT_DISPLAY_SETTINGS)
    expect(loadDisplaySettings(null)).toEqual(DEFAULT_DISPLAY_SETTINGS)
    const exploding = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(loadDisplaySettings(exploding)).toEqual(DEFAULT_DISPLAY_SETTINGS)
    expect(() => saveDisplaySettings(DEFAULT_DISPLAY_SETTINGS, exploding)).not.toThrow()
    expect(() => saveDisplaySettings(DEFAULT_DISPLAY_SETTINGS, null)).not.toThrow()
  })
})
