/**
 * WebRTCPeer - Wrapper around Simple Peer library for WebRTC connection management
 *
 * Handles:
 * - Peer connection initialization (host/guest)
 * - Signal data exchange for manual signaling
 * - Data channel management
 * - Connection timeout handling
 * - ArrayBuffer transmission
 */

import SimplePeer from 'simple-peer'
import type { WebRTCConfig } from './types'

export class WebRTCPeer {
  private peer: SimplePeer.Instance | null = null
  private config: WebRTCConfig
  private connectionTimeout: NodeJS.Timeout | null = null
  private connected: boolean = false

  // Event callbacks
  public onSignal: (signalData: string) => void = () => {}
  public onConnect: () => void = () => {}
  public onData: (data: ArrayBuffer) => void = () => {}
  public onClose: () => void = () => {}
  public onError: (error: Error) => void = () => {}

  constructor(config: WebRTCConfig) {
    this.config = config
  }

  /**
   * Initialize as host (creates offer)
   */
  public initAsHost(): void {
    this.setupPeer(true)
    this.startConnectionTimeout()
  }

  /**
   * Initialize as guest (receives offer, creates answer)
   */
  public initAsGuest(offerData: string): void {
    this.setupPeer(false)
    this.startConnectionTimeout()

    try {
      const signalData = JSON.parse(offerData)
      this.peer?.signal(signalData)
    } catch (error) {
      this.onError(new Error('Invalid offer data: ' + (error as Error).message))
    }
  }

  /**
   * Send data through the data channel
   */
  public send(data: ArrayBuffer): void {
    if (!this.peer || !this.connected) {
      console.warn('Cannot send data: peer not connected')
      return
    }

    try {
      this.peer.send(data)
    } catch (error) {
      this.onError(new Error('Failed to send data: ' + (error as Error).message))
    }
  }

  /**
   * Check if peer is connected
   */
  public isConnected(): boolean {
    return this.connected
  }

  /**
   * Close the peer connection
   */
  public close(): void {
    this.clearConnectionTimeout()

    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    this.connected = false
  }

  /**
   * Setup Simple Peer instance with event handlers
   */
  private setupPeer(isInitiator: boolean): void {
    // Clean up existing peer if any
    if (this.peer) {
      this.peer.destroy()
    }

    // Create new Simple Peer instance
    this.peer = new SimplePeer({
      initiator: isInitiator,
      config: {
        iceServers: this.config.iceServers,
      },
      // Use reliable ordered data channel
      channelConfig: {
        ordered: true,
      },
      // Disable trickle ICE for simpler manual signaling
      trickle: false,
    })

    // Signal event - emitted when signaling data is ready
    this.peer.on('signal', (data: SimplePeer.SignalData) => {
      const signalString = JSON.stringify(data)
      this.onSignal(signalString)
    })

    // Connect event - emitted when connection is established
    this.peer.on('connect', () => {
      this.clearConnectionTimeout()
      this.connected = true
      this.onConnect()
    })

    // Data event - emitted when data is received
    this.peer.on('data', (data: Uint8Array) => {
      // Convert Uint8Array to ArrayBuffer
      const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer
      this.onData(arrayBuffer)
    })

    // Close event - emitted when connection is closed
    this.peer.on('close', () => {
      this.clearConnectionTimeout()
      this.connected = false
      this.onClose()
    })

    // Error event - emitted on errors
    this.peer.on('error', (err: Error) => {
      this.clearConnectionTimeout()
      this.connected = false
      this.onError(err)
    })
  }

  /**
   * Start connection timeout timer
   */
  private startConnectionTimeout(): void {
    this.clearConnectionTimeout()

    this.connectionTimeout = setTimeout(() => {
      if (!this.connected) {
        const error = new Error(
          'Connection timeout: Failed to establish connection within 30 seconds'
        )
        this.onError(error)
        this.close()
      }
    }, this.config.connectionTimeout)
  }

  /**
   * Clear connection timeout timer
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
  }

  /**
   * Process signal data from peer (for guest after receiving answer)
   */
  public signal(signalData: string): void {
    if (!this.peer) {
      this.onError(new Error('Cannot signal: peer not initialized'))
      return
    }

    try {
      const data = JSON.parse(signalData)
      this.peer.signal(data)
    } catch (error) {
      this.onError(new Error('Invalid signal data: ' + (error as Error).message))
    }
  }
}
