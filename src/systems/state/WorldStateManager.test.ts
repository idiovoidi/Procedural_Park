import { afterEach, describe, expect, it } from 'vitest'
import { WorldStateManager } from './WorldStateManager'
import { formatPlayTime, getRarityTier } from './world-state-serializer'

describe('WorldStateManager', () => {
  let manager: WorldStateManager | null = null

  const create = () => {
    manager = new WorldStateManager()
    return manager
  }

  afterEach(() => {
    manager?.dispose()
    manager = null
  })

  it('round-trips a save through a slot', () => {
    const wsm = create()
    expect(wsm.createSave('slot_1', { worldSeed: 1234 })).toBe(true)
    expect(wsm.hasSave('slot_1')).toBe(true)

    const loaded = wsm.loadSave('slot_1')
    expect(loaded?.worldSeed).toBe(1234)
    expect(loaded?.photos).toEqual([])
    expect(loaded?.version).toBeDefined()
  })

  it('returns null for an empty slot', () => {
    expect(create().loadSave('slot_3')).toBeNull()
  })

  it('records metadata and deletes saves', () => {
    const wsm = create()
    wsm.createSave('slot_2', {})
    expect(wsm.getMetadata('slot_2')).not.toBeNull()
    expect(wsm.deleteSave('slot_2')).toBe(true)
    expect(wsm.hasSave('slot_2')).toBe(false)
    expect(wsm.getMetadata('slot_2')).toBeNull()
  })

  it('exports and re-imports a save into another slot', () => {
    const wsm = create()
    wsm.createSave('slot_1', { worldSeed: 99 })
    const json = wsm.exportSave('slot_1')
    expect(json).not.toBeNull()
    expect(wsm.importSave('slot_2', json as string)).toBe(true)
    expect(wsm.loadSave('slot_2')?.worldSeed).toBe(99)
  })

  it('rejects malformed import data without touching the slot', () => {
    const wsm = create()
    expect(wsm.importSave('slot_1', 'not json')).toBe(false)
    expect(wsm.hasSave('slot_1')).toBe(false)
  })

  it('exposes five numbered slots', () => {
    expect(create().getAvailableSlots()).toEqual(['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5'])
  })
})

describe('world-state helpers', () => {
  it('maps rarity values to tiers', () => {
    expect(getRarityTier(0.1)).toBe('common')
    expect(getRarityTier(0.4)).toBe('uncommon')
    expect(getRarityTier(0.6)).toBe('rare')
    expect(getRarityTier(0.8)).toBe('epic')
    expect(getRarityTier(0.95)).toBe('legendary')
  })

  it('formats play time compactly', () => {
    expect(formatPlayTime(45)).toBe('45s')
    expect(formatPlayTime(125)).toBe('2m 5s')
    expect(formatPlayTime(3725)).toBe('1h 2m')
  })
})
