/**
 * WebRTCPeer - Wrapper around Simple Peer library for WebRTC connections
 * Handles peer-to-peer connection establishment and data transmission
 */

import SimplePeer from 'simple-peer';
import type { WebRTCConfig } from '../common/types';

export class WebRTCPeer {
  private peer: SimplePeer.Instance | null = null;
  private config: WebRTCConfig;
  private connectionTimeout: NodeJS.Timeout | null = null;

  // Event callbacks
  public onSignal: (signalData: string) => void = () => {};
  public onConnect: () => void = () => {};
  public onData: (data: ArrayBuffer) => void = () => {};
  public onClose: () => void = () => {};
  public onError: (error: Error) => void = () => {};

  constructor(config: WebRTCConfig) {
    this.config = config;
  }

  /**
   * Initialize as host (creates offer)
   */
  public initAsHost(): void {
    this.cleanup();

    this.peer = new SimplePeer({
      initiator: true,
      trickle: this.config.trickle,
      config: {
        iceServers: this.config.iceServers,
      },
    });

    this.setupEventHandlers();
    this.startConnectionTimeout();
  }

  /**
   * Initialize as guest (receives offer, creates answer)
   * @param offerData - JSON string containing the offer signal data
   */
  public initAsGuest(offerData: string): void {
    this.cleanup();

    try {
      const signalData = JSON.parse(offerData);

      this.peer = new SimplePeer({
        initiator: false,
        trickle: this.config.trickle,
        config: {
          iceServers: this.config.iceServers,
        },
      });

      this.setupEventHandlers();
      this.startConnectionTimeout();

      // Process the offer signal
      this.peer.signal(signalData);
    } catch (error) {
      this.onError(
        new Error(`Invalid offer data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  /**
   * Process signal data (answer from guest)
   * @param signalData - JSON string containing signal data
   */
  public processSignal(signalData: string): void {
    if (!this.peer) {
      this.onError(new Error('Peer not initialized'));
      return;
    }

    try {
      const signal = JSON.parse(signalData);
      this.peer.signal(signal);
    } catch (error) {
      this.onError(
        new Error(`Invalid signal data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  /**
   * Send data to connected peer
   * @param data - ArrayBuffer to send
   */
  public send(data: ArrayBuffer): void {
    if (!this.peer || this.peer.destroyed) {
      console.warn('Cannot send data: peer not connected');
      return;
    }

    try {
      this.peer.send(data);
    } catch (error) {
      this.onError(
        new Error(`Failed to send data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  /**
   * Close the peer connection
   */
  public close(): void {
    this.cleanup();
  }

  /**
   * Check if peer is connected
   */
  public isConnected(): boolean {
    return this.peer !== null && !this.peer.destroyed && this.peer.connected;
  }

  /**
   * Set up event handlers for the peer connection
   */
  private setupEventHandlers(): void {
    if (!this.peer) return;

    // Signal event - emitted when signaling data is ready
    this.peer.on('signal', (data: SimplePeer.SignalData) => {
      const signalString = JSON.stringify(data);
      this.onSignal(signalString);
    });

    // Connect event - emitted when connection is established
    this.peer.on('connect', () => {
      this.clearConnectionTimeout();
      this.onConnect();
    });

    // Data event - emitted when data is received
    this.peer.on('data', (data: Uint8Array) => {
      // Convert Uint8Array to ArrayBuffer
      const arrayBuffer: ArrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer;
      this.onData(arrayBuffer);
    });

    // Close event - emitted when connection is closed
    this.peer.on('close', () => {
      this.clearConnectionTimeout();
      this.onClose();
      this.cleanup();
    });

    // Error event - emitted when an error occurs
    this.peer.on('error', (err: Error) => {
      this.clearConnectionTimeout();
      this.onError(err);
    });
  }

  /**
   * Start connection timeout (30 seconds)
   */
  private startConnectionTimeout(): void {
    this.clearConnectionTimeout();

    this.connectionTimeout = setTimeout(() => {
      if (this.peer && !this.peer.connected) {
        this.onError(new Error('Connection timeout: Failed to establish connection within 30 seconds'));
        this.cleanup();
      }
    }, this.config.connectionTimeout);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Clean up peer connection and resources
   */
  private cleanup(): void {
    this.clearConnectionTimeout();

    if (this.peer) {
      try {
        if (!this.peer.destroyed) {
          this.peer.destroy();
        }
      } catch (error) {
        console.warn('Error destroying peer:', error);
      }
      this.peer = null;
    }
  }
}
