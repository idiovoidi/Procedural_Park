/**
 * WebRTCProvider - WebRTC-based multiplayer implementation
 * Implements IMultiplayerProvider using peer-to-peer WebRTC connections
 */

import type { IMultiplayerProvider } from '../common/IMultiplayerProvider';
import type { GameState, GameEvent, WebRTCConfig } from '../common/types';
import { MessageType } from '../common/types';
import { WebRTCPeer } from './WebRTCPeer';
import { StateSync } from './StateSync';

export class WebRTCProvider implements IMultiplayerProvider {
  private webrtcPeer: WebRTCPeer;
  private stateSync: StateSync;
  private config: WebRTCConfig;
  private isHost: boolean = false;
  private connected: boolean = false;
  private latency: number = 0;
  private lastPingTime: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  // Event callbacks (required by IMultiplayerProvider)
  public onConnected: () => void = () => {};
  public onDisconnected: () => void = () => {};
  public onPeerStateUpdate: (state: GameState) => void = () => {};
  public onGameEvent: (event: GameEvent) => void = () => {};
  public onError: (error: Error) => void = () => {};

  // Callback for signal data (used by ConnectionUI)
  public onSignalData: (data: string, type: 'offer' | 'answer') => void = () => {};

  constructor(config: WebRTCConfig) {
    this.config = config;
    this.webrtcPeer = new WebRTCPeer(config);
    this.stateSync = new StateSync(config.updateRate);

    this.setupPeerCallbacks();
  }

  /**
   * Create a new session as host
   * Generates offer signal data for the guest to use
   */
  public async createSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.connected = false;

      // Set up one-time signal handler for offer
      const originalOnSignal = this.webrtcPeer.onSignal;
      this.webrtcPeer.onSignal = (signalData: string) => {
        // Restore original handler
        this.webrtcPeer.onSignal = originalOnSignal;
        
        // Emit offer signal data
        this.onSignalData(signalData, 'offer');
        resolve();
      };

      // Set up error handler
      const originalOnError = this.webrtcPeer.onError;
      this.webrtcPeer.onError = (error: Error) => {
        this.webrtcPeer.onError = originalOnError;
        this.onError(error);
        reject(error);
      };

      // Initialize as host
      this.webrtcPeer.initAsHost();
    });
  }

  /**
   * Join an existing session as guest
   * @param connectionData - Offer signal data from host
   */
  public async joinSession(connectionData: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.connected = false;

      // Set up one-time signal handler for answer
      const originalOnSignal = this.webrtcPeer.onSignal;
      this.webrtcPeer.onSignal = (signalData: string) => {
        // Restore original handler
        this.webrtcPeer.onSignal = originalOnSignal;
        
        // Emit answer signal data
        this.onSignalData(signalData, 'answer');
        resolve();
      };

      // Set up error handler
      const originalOnError = this.webrtcPeer.onError;
      this.webrtcPeer.onError = (error: Error) => {
        this.webrtcPeer.onError = originalOnError;
        this.onError(error);
        reject(error);
      };

      // Initialize as guest with offer data
      this.webrtcPeer.initAsGuest(connectionData);
    });
  }

  /**
   * Process answer signal data (called by host after guest joins)
   * @param answerData - Answer signal data from guest
   */
  public processAnswer(answerData: string): void {
    if (!this.isHost) {
      this.onError(new Error('Only host can process answer data'));
      return;
    }

    this.webrtcPeer.processSignal(answerData);
  }

  /**
   * Disconnect from current session
   */
  public disconnect(): void {
    this.stopPingInterval();
    this.webrtcPeer.close();
    this.connected = false;
    this.latency = 0;
  }

  /**
   * Update multiplayer state (called each frame)
   * @param deltaTime - Time elapsed since last update in seconds
   */
  public update(deltaTime: number): void {
    // Nothing to do here for WebRTC - state is sent via sendGameState
    // and received via data channel callbacks
  }

  /**
   * Send current game state to peer
   * @param state - Current game state
   */
  public sendGameState(state: GameState): void {
    if (!this.connected) return;

    const currentTime = performance.now();

    // Check if we should send an update (rate limiting)
    if (!this.stateSync.shouldSendUpdate(currentTime)) {
      return;
    }

    // Check if state has changed significantly (delta compression)
    if (!this.stateSync.hasStateChanged(state)) {
      return;
    }

    // Serialize and send state
    const data = this.stateSync.serializeState(state);
    this.webrtcPeer.send(data);
    this.stateSync.markUpdateSent(currentTime);
  }

  /**
   * Send a game event to peer
   * @param event - Game event to send
   */
  public sendGameEvent(event: GameEvent): void {
    if (!this.connected) return;

    const data = this.stateSync.serializeEvent(event);
    this.webrtcPeer.send(data);
  }

  /**
   * Check if currently connected to peer
   */
  public isConnected(): boolean {
    return this.connected && this.webrtcPeer.isConnected();
  }

  /**
   * Get current network latency
   * @returns Latency in milliseconds
   */
  public getLatency(): number {
    return this.latency;
  }

  /**
   * Set up callbacks for WebRTCPeer events
   */
  private setupPeerCallbacks(): void {
    this.webrtcPeer.onConnect = () => {
      this.connected = true;
      this.startPingInterval();
      this.onConnected();
    };

    this.webrtcPeer.onData = (data: ArrayBuffer) => {
      this.handleDataReceived(data);
    };

    this.webrtcPeer.onClose = () => {
      this.connected = false;
      this.stopPingInterval();
      this.onDisconnected();
    };

    this.webrtcPeer.onError = (error: Error) => {
      this.onError(error);
    };
  }

  /**
   * Handle received data from peer
   * @param data - Received ArrayBuffer
   */
  private handleDataReceived(data: ArrayBuffer): void {
    if (data.byteLength < 1) {
      console.warn('Received empty data');
      return;
    }

    try {
      const view = new DataView(data);
      const messageType = view.getUint8(0);

      switch (messageType) {
        case MessageType.STATE_UPDATE:
          this.handleStateUpdate(data);
          break;

        case MessageType.GAME_EVENT:
          this.handleGameEvent(data);
          break;

        case MessageType.PING:
          this.handlePing(data);
          break;

        case MessageType.PONG:
          this.handlePong(data);
          break;

        default:
          console.warn('Unknown message type:', messageType);
      }
    } catch (error) {
      console.error('Error handling received data:', error);
      this.onError(
        new Error(`Failed to process received data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  /**
   * Handle state update message
   * @param data - State update data
   */
  private handleStateUpdate(data: ArrayBuffer): void {
    const state = this.stateSync.deserializeState(data);
    this.onPeerStateUpdate(state);
  }

  /**
   * Handle game event message
   * @param data - Game event data
   */
  private handleGameEvent(data: ArrayBuffer): void {
    const event = this.stateSync.deserializeEvent(data);
    this.onGameEvent(event);
  }

  /**
   * Handle ping message - respond with pong
   * @param data - Ping data
   */
  private handlePing(data: ArrayBuffer): void {
    const timestamp = this.stateSync.deserializePingPong(data);
    const pongData = this.stateSync.serializePong(timestamp);
    this.webrtcPeer.send(pongData);
  }

  /**
   * Handle pong message - calculate latency
   * @param data - Pong data
   */
  private handlePong(data: ArrayBuffer): void {
    const originalTimestamp = this.stateSync.deserializePingPong(data);
    const currentTime = performance.now();
    this.latency = currentTime - originalTimestamp;
  }

  /**
   * Start sending periodic ping messages for latency measurement
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    // Send ping every 2 seconds
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.lastPingTime = performance.now();
        const pingData = this.stateSync.serializePing(this.lastPingTime);
        this.webrtcPeer.send(pingData);
      }
    }, 2000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
