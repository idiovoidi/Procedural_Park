import type { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG } from '../types'
import { WebRTCPeer } from './WebRTCPeer'

const { instances } = vi.hoisted(() => ({ instances: [] as unknown[] }))

// Stand-in for simple-peer: an emitter we can drive by hand, no real WebRTC.
vi.mock('simple-peer', async () => {
  const { EventEmitter } = await import('node:events')
  class FakePeer extends EventEmitter {
    signal = vi.fn()
    send = vi.fn()
    destroy = vi.fn(() => {
      this.emit('close')
    })
    constructor() {
      super()
      instances.push(this)
    }
  }
  return { default: FakePeer }
})

const latestPeer = () => instances[instances.length - 1] as EventEmitter & { destroy: () => void }

const CONFIG = { ...DEFAULT_CONFIG, connectionTimeout: 30_000, signalingTimeout: 300_000 }
const OFFER = JSON.stringify({ type: 'offer', sdp: 'x' })
const ANSWER = JSON.stringify({ type: 'answer', sdp: 'y' })

function makePeer() {
  const peer = new WebRTCPeer(CONFIG)
  const onError = vi.fn()
  const onClose = vi.fn()
  peer.onError = onError
  peer.onClose = onClose
  return { peer, onError, onClose }
}

describe('WebRTCPeer connection timeouts', () => {
  beforeEach(() => {
    instances.length = 0
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not time out the host while a human relays the codes', () => {
    const { peer, onError } = makePeer()
    peer.initAsHost()
    vi.advanceTimersByTime(CONFIG.connectionTimeout * 5) // far beyond the 30s connect window
    expect(onError).not.toHaveBeenCalled()
  })

  it('gives up on a stalled code exchange after the signaling timeout', () => {
    const { peer, onError } = makePeer()
    peer.initAsHost()
    vi.advanceTimersByTime(CONFIG.signalingTimeout)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toContain('300 seconds')
  })

  it('starts the 30s connect window only once the host applies the answer', () => {
    const { peer, onError } = makePeer()
    peer.initAsHost()
    vi.advanceTimersByTime(120_000) // human takes two minutes to paste the answer
    peer.signal(ANSWER)

    vi.advanceTimersByTime(CONFIG.connectionTimeout - 1)
    expect(onError).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toContain('30 seconds')
  })

  it('cancels the timeout when the connection succeeds', () => {
    const { peer, onError } = makePeer()
    peer.initAsHost()
    peer.signal(ANSWER)
    latestPeer().emit('connect')
    vi.advanceTimersByTime(CONFIG.signalingTimeout * 2)
    expect(onError).not.toHaveBeenCalled()
    expect(peer.isConnected()).toBe(true)
  })

  it('also bounds the guest while waiting for the host', () => {
    const { peer, onError } = makePeer()
    peer.initAsGuest(OFFER)
    vi.advanceTimersByTime(CONFIG.connectionTimeout * 5)
    expect(onError).not.toHaveBeenCalled()
    vi.advanceTimersByTime(CONFIG.signalingTimeout)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})

describe('WebRTCPeer disconnects', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('does not report a deliberate close() as an error', () => {
    const { peer, onError, onClose } = makePeer()
    peer.initAsHost()
    const fake = latestPeer()
    fake.emit('connect')

    peer.close()
    fake.emit('error', new Error('OperationError: User-Initiated Abort, reason=Close called'))

    expect(onError).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
    expect(peer.isConnected()).toBe(false)
  })

  it('treats the other player closing as a normal disconnect', () => {
    const { peer, onError } = makePeer()
    peer.initAsGuest(OFFER)
    const fake = latestPeer()
    fake.emit('connect')

    fake.emit('error', new Error('User-Initiated Abort, reason=Close called'))

    expect(onError).not.toHaveBeenCalled()
  })

  it('treats a bare OperationError on an established connection as a close', () => {
    const { peer, onError } = makePeer()
    peer.initAsGuest(OFFER)
    const fake = latestPeer()
    fake.emit('connect')

    const bare = new Error('')
    bare.name = 'OperationError'
    fake.emit('error', bare)

    expect(onError).not.toHaveBeenCalled()
  })

  it('still reports OperationErrors that carry a message or occur before connecting', () => {
    const { peer, onError } = makePeer()
    peer.initAsHost()
    const fake = latestPeer()

    const early = new Error('')
    early.name = 'OperationError'
    fake.emit('error', early) // not connected yet

    const withMessage = new Error('Failed to set remote answer sdp')
    withMessage.name = 'OperationError'
    peer.initAsHost()
    latestPeer().emit('connect')
    latestPeer().emit('error', withMessage)

    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('still reports genuine connection errors', () => {
    const { peer, onError } = makePeer()
    peer.initAsHost()
    latestPeer().emit('error', new Error('Connection failed.'))

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toBe('Connection failed.')
  })

  it('reports signaling before initialisation', () => {
    const { peer, onError } = makePeer()
    peer.signal(ANSWER)
    expect(onError.mock.calls[0][0].message).toContain('peer not initialized')
  })
})
