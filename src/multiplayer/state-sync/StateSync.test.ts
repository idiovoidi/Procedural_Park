import { describe, expect, it, vi } from 'vitest'
import { type GameState, MessageType } from '../types'
import { StateSync } from './StateSync'

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  position: { x: 1.5, y: -2.25, z: 300 },
  rotation: { x: 0.5, y: -1.25, z: 0 },
  cameraMode: 'free',
  rideProgress: 0.75,
  timestamp: 123456,
  ...overrides,
})

describe('StateSync state messages', () => {
  it('round-trips a state packet', () => {
    const sync = new StateSync()
    const state = makeState()
    const decoded = sync.deserializeState(sync.serializeState(state))
    expect(decoded).toEqual(state) // all chosen values are exactly representable as float32
  })

  it('round-trips both camera modes', () => {
    const sync = new StateSync()
    for (const cameraMode of ['ride', 'free'] as const) {
      const decoded = sync.deserializeState(sync.serializeState(makeState({ cameraMode })))
      expect(decoded?.cameraMode).toBe(cameraMode)
    }
  })

  it('produces a fixed-size packet tagged as STATE_UPDATE', () => {
    const sync = new StateSync()
    const buf = sync.serializeState(makeState())
    expect(buf.byteLength).toBe(34)
    expect(sync.getMessageType(buf)).toBe(MessageType.STATE_UPDATE)
  })

  it('rejects truncated state packets', () => {
    const sync = new StateSync()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(sync.deserializeState(sync.serializeState(makeState()).slice(0, 10))).toBeNull()
    err.mockRestore()
  })

  it('rejects a packet of the wrong type', () => {
    const sync = new StateSync()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(sync.deserializeState(sync.serializeEvent({ type: 'photo', timestamp: 1 }))).toBeNull()
    err.mockRestore()
  })
})

describe('StateSync events', () => {
  it('round-trips photo and creature_interaction events', () => {
    const sync = new StateSync()
    for (const type of ['photo', 'creature_interaction'] as const) {
      const buf = sync.serializeEvent({ type, timestamp: 42 })
      expect(sync.getMessageType(buf)).toBe(MessageType.GAME_EVENT)
      expect(sync.deserializeEvent(buf)).toEqual({ type, timestamp: 42 })
    }
  })
})

describe('StateSync ping/pong', () => {
  it('preserves the ping timestamp with float64 precision', () => {
    const sync = new StateSync()
    const ts = 1234567.891
    const ping = sync.serializePing(ts)
    expect(sync.getMessageType(ping)).toBe(MessageType.PING)
    expect(sync.deserializePingPong(ping)).toEqual({ type: MessageType.PING, timestamp: ts })
  })

  it('echoes the same timestamp in a pong', () => {
    const sync = new StateSync()
    const pong = sync.serializePong(98765.4321)
    expect(sync.getMessageType(pong)).toBe(MessageType.PONG)
    expect(sync.deserializePingPong(pong)?.timestamp).toBe(98765.4321)
  })
})

describe('StateSync.getMessageType', () => {
  it('returns null for empty or unknown messages', () => {
    const sync = new StateSync()
    expect(sync.getMessageType(new ArrayBuffer(0))).toBeNull()
    expect(sync.getMessageType(new Uint8Array([99]).buffer)).toBeNull()
  })
})

describe('StateSync throttling', () => {
  it('allows ~10 updates per second by default', () => {
    const sync = new StateSync(10)
    expect(sync.shouldSendUpdate(1000)).toBe(true)
    expect(sync.shouldSendUpdate(1050)).toBe(false)
    expect(sync.shouldSendUpdate(1099)).toBe(false)
    expect(sync.shouldSendUpdate(1100)).toBe(true)
  })
})

describe('StateSync interpolation buffer', () => {
  it('returns null before anything has been received', () => {
    expect(new StateSync().getInterpolatedState(0)).toBeNull()
  })

  it('interpolates halfway between two buffered states', () => {
    const sync = new StateSync()
    sync.addStateToBuffer(makeState({ position: { x: 0, y: 0, z: 0 }, timestamp: 1000 }))
    sync.addStateToBuffer(makeState({ position: { x: 10, y: 20, z: 30 }, timestamp: 1100 }))
    const mid = sync.getInterpolatedState(1050)
    expect(mid?.position).toEqual({ x: 5, y: 10, z: 15 })
  })

  it('falls back to the newest state when past the buffer', () => {
    const sync = new StateSync()
    sync.addStateToBuffer(makeState({ timestamp: 1000 }))
    const newest = makeState({ position: { x: 9, y: 9, z: 9 }, timestamp: 1100 })
    sync.addStateToBuffer(newest)
    expect(sync.getInterpolatedState(5000)).toBe(newest)
  })

  it('caps the buffer at 10 states and can be cleared', () => {
    const sync = new StateSync()
    for (let i = 0; i < 25; i++) {
      sync.addStateToBuffer(makeState({ timestamp: i * 100 }))
    }
    // Oldest states were dropped, so t=0 is before the buffered range -> newest state returned
    expect(sync.getInterpolatedState(0)?.timestamp).toBe(2400)
    sync.clearBuffer()
    expect(sync.getInterpolatedState(0)).toBeNull()
  })
})
