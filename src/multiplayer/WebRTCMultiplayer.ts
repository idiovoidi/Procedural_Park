import { log } from '@core/utils'
/**
 * WebRTCMultiplayer - Main coordinator for peer-to-peer multiplayer
 *
 * Integrates all multiplayer components:
 * - WebRTCPeer: Connection management
 * - StateSync: Binary state serialization
 * - PeerAvatar: 3D rendering of peer
 * - ConnectionUI: User interface
 *
 * Manages the complete multiplayer lifecycle from connection to disconnection
 */

import type * as THREE from 'three'
import { PeerAvatar } from './peer-avatar'
import { StateSync } from './state-sync'
import type { GameEvent, GameState, WebRTCConfig } from './types'
import { MessageType } from './types'
import { ConnectionUI, WebRTCPeer } from './webrtc'

export class WebRTCMultiplayer {
  private peer: WebRTCPeer
  private stateSync: StateSync
  private avatar: PeerAvatar | null = null
  private ui: ConnectionUI
  private scene: THREE.Scene
  private isHost: boolean = false

  // Latency measurement
  private latency: number = 0
  private pingInterval: NodeJS.Timeout | null = null

  // Event callbacks
  public onConnected: () => void = () => {}
  public onDisconnected: () => void = () => {}
  public onPeerStateUpdate: (state: GameState) => void = () => {}
  public onGameEvent: (event: GameEvent) => void = () => {}
  /** Text from the peer's social layer (already de-framed, not yet reassembled). */
  public onSocial: (text: string) => void = () => {}
  public onError: (error: Error) => void = () => {}

  constructor(scene: THREE.Scene, config: WebRTCConfig) {
    this.scene = scene

    // Initialize components
    this.peer = new WebRTCPeer(config)
    this.stateSync = new StateSync(config.updateRate)
    this.ui = new ConnectionUI()

    // Setup peer event handlers
    this.setupPeerHandlers()

    // Setup UI event handlers
    this.setupUIHandlers()
  }

  /**
   * Setup WebRTCPeer event handlers
   */
  private setupPeerHandlers(): void {
    this.peer.onSignal = (signalData: string) => {
      this.handleSignalData(signalData)
    }

    this.peer.onConnect = () => {
      this.handleConnect()
    }

    this.peer.onData = (data: ArrayBuffer) => {
      this.handleDataReceived(data)
    }

    this.peer.onClose = () => {
      this.handleDisconnect()
    }

    this.peer.onError = (error: Error) => {
      this.handleError(error)
    }
  }

  /**
   * Setup ConnectionUI event handlers
   */
  private setupUIHandlers(): void {
    this.ui.onCreateSession = () => {
      this.createSession()
    }

    this.ui.onJoinSession = (offerData: string) => {
      this.joinSession(offerData)
    }

    this.ui.onAnswerProvided = (answerData: string) => {
      // Host receives answer from guest
      this.peer.signal(answerData)
    }

    this.ui.onDisconnect = () => {
      this.disconnect()
    }
  }

  /**
   * Create a new session as host
   */
  public createSession(): void {
    try {
      this.isHost = true
      this.ui.updateStatus({ state: 'connecting', message: 'Creating session...' })
      this.peer.initAsHost()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  /**
   * Join an existing session as guest
   */
  public joinSession(offerData: string): void {
    try {
      this.isHost = false
      this.ui.updateStatus({ state: 'connecting', message: 'Joining session...' })
      this.peer.initAsGuest(offerData)
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  /**
   * Disconnect from the current session
   */
  public disconnect(): void {
    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    // Close peer connection
    this.peer.close()

    // Clean up avatar
    if (this.avatar) {
      this.avatar.dispose()
      this.avatar = null
    }

    // Clear state sync buffer
    this.stateSync.clearBuffer()

    // Update UI
    this.ui.updateStatus({ state: 'disconnected' })

    // Reset state
    this.isHost = false
    this.latency = 0
  }

  /**
   * Update loop - called every frame
   */
  public update(deltaTime: number): void {
    if (!this.isConnected()) {
      return
    }

    // Update avatar with interpolation
    if (this.avatar) {
      this.avatar.update(deltaTime)
    }
  }

  /**
   * Send current game state to peer
   */
  public sendGameState(state: GameState): void {
    if (!this.isConnected()) {
      return
    }

    // Check if we should send an update based on update rate
    if (!this.stateSync.shouldSendUpdate(state.timestamp)) {
      return
    }

    try {
      const data = this.stateSync.serializeState(state)
      this.peer.send(data)
    } catch (error) {
      console.error('Failed to send game state:', error)
    }
  }

  /**
   * Send a game event to peer
   */
  public sendEvent(event: GameEvent): void {
    if (!this.isConnected()) {
      return
    }

    try {
      const data = this.stateSync.serializeEvent(event)
      this.peer.send(data)
    } catch (error) {
      console.error('Failed to send game event:', error)
    }
  }

  /** Send a text message through the social channel (the caller chunks big payloads). */
  public sendSocial(text: string): void {
    if (!this.isConnected()) return
    try {
      this.peer.send(this.stateSync.serializeSocial(text))
    } catch (error) {
      console.error('Failed to send social message:', error)
    }
  }

  /**
   * Check if currently connected to a peer
   */
  public isConnected(): boolean {
    return this.peer.isConnected()
  }

  /**
   * Get current latency in milliseconds
   */
  public getLatency(): number {
    return this.latency
  }

  /**
   * Show the connection UI
   */
  public showUI(): void {
    this.ui.show()
  }

  /**
   * Hide the connection UI
   */
  public hideUI(): void {
    this.ui.hide()
  }

  /**
   * Toggle the connection UI visibility
   */
  public toggleUI(): void {
    // Check if modal is currently shown by checking if it exists in DOM
    const existingModal = document.querySelector('.mp-modal-overlay')
    if (existingModal) {
      this.ui.hide()
    } else {
      this.ui.show()
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.disconnect()
    this.ui.dispose()
  }

  /**
   * Handle signal data from peer (offer/answer)
   */
  private handleSignalData(signalData: string): void {
    if (this.isHost) {
      // Host generated offer
      this.ui.showSignalData(signalData, 'offer')
    } else {
      // Guest generated answer
      this.ui.showSignalData(signalData, 'answer')
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    log.debug('WebRTC connection established')

    // Create peer avatar
    this.avatar = new PeerAvatar(this.scene, 'Friend')
    this.avatar.show()

    // Update UI
    this.ui.updateStatus({ state: 'connected', latency: this.latency })

    // Start latency measurement
    this.startPingInterval()

    // Notify callback
    this.onConnected()
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    log.debug('WebRTC connection closed')

    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    // Clean up avatar
    if (this.avatar) {
      this.avatar.dispose()
      this.avatar = null
    }

    // Clear state sync buffer
    this.stateSync.clearBuffer()

    // Update UI
    this.ui.updateStatus({ state: 'disconnected' })

    // Notify callback
    this.onDisconnected()
  }

  /**
   * Handle received data from peer
   */
  private handleDataReceived(data: ArrayBuffer): void {
    try {
      // Determine message type
      const messageType = this.stateSync.getMessageType(data)

      if (messageType === null) {
        console.error('Invalid message type')
        return
      }

      switch (messageType) {
        case MessageType.STATE_UPDATE:
          this.handleStateUpdate(data)
          break

        case MessageType.GAME_EVENT:
          this.handleGameEvent(data)
          break

        case MessageType.SOCIAL: {
          const text = this.stateSync.deserializeSocial(data)
          if (text !== null) this.onSocial(text)
          break
        }

        case MessageType.PING:
          this.handlePing(data)
          break

        case MessageType.PONG:
          this.handlePong(data)
          break

        default:
          console.warn('Unknown message type:', messageType)
      }
    } catch (error) {
      console.error('Error processing received data:', error)
    }
  }

  /**
   * Handle state update message
   */
  private handleStateUpdate(data: ArrayBuffer): void {
    const state = this.stateSync.deserializeState(data)

    if (!state) {
      console.error('Failed to deserialize state')
      return
    }

    // Add to interpolation buffer
    this.stateSync.addStateToBuffer(state)

    // Update avatar
    if (this.avatar) {
      this.avatar.updateState(state)
    }

    // Notify callback
    this.onPeerStateUpdate(state)
  }

  /**
   * Handle game event message
   */
  private handleGameEvent(data: ArrayBuffer): void {
    const event = this.stateSync.deserializeEvent(data)

    if (!event) {
      console.error('Failed to deserialize event')
      return
    }

    // Show notification for photo events
    if (event.type === 'photo') {
      this.ui.showNotification('📸 Friend took a photo!', 2000)
    }

    // Notify callback
    this.onGameEvent(event)
  }

  /**
   * Handle PING message - respond with PONG
   */
  private handlePing(data: ArrayBuffer): void {
    const pingData = this.stateSync.deserializePingPong(data)

    if (!pingData) {
      console.error('Failed to deserialize ping')
      return
    }

    // Send PONG response with the same timestamp
    const pongData = this.stateSync.serializePong(pingData.timestamp)
    this.peer.send(pongData)
  }

  /**
   * Handle PONG message - calculate latency
   */
  private handlePong(data: ArrayBuffer): void {
    const pongData = this.stateSync.deserializePingPong(data)

    if (!pongData) {
      console.error('Failed to deserialize pong')
      return
    }

    // Calculate round-trip time
    const now = performance.now()
    const rtt = now - pongData.timestamp

    // Update latency (one-way is half of round-trip)
    this.latency = Math.round(rtt / 2)

    // Update UI with new latency
    if (this.isConnected()) {
      this.ui.updateStatus({ state: 'connected', latency: this.latency })
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('WebRTC error:', error)

    // Update UI
    this.ui.updateStatus({
      state: 'error',
      message: error.message,
    })

    // Show notification
    this.ui.showNotification(`❌ Error: ${error.message}`, 5000)

    // Notify callback
    this.onError(error)
  }

  /**
   * Start sending periodic PING messages for latency measurement
   */
  private startPingInterval(): void {
    // Clear existing interval if any
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    // Send PING every 2 seconds
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        const timestamp = performance.now()
        const pingData = this.stateSync.serializePing(timestamp)
        this.peer.send(pingData)
      }
    }, 2000)
  }
}
