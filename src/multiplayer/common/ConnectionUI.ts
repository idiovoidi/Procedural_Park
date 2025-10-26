import type { ConnectionStatus } from './types';

/**
 * ConnectionUI - Manages the user interface for multiplayer connections
 * 
 * Features:
 * - Modal overlay with connection options (Create/Join session)
 * - Status indicator for connection state
 * - Notification system for game events
 * - Latency display
 * - Provider-specific UI panels (WebRTC signal data vs Colyseus room ID)
 */
export class ConnectionUI {
  private container: HTMLElement;
  private modal: HTMLElement | null = null;
  private statusIndicator: HTMLElement | null = null;
  private notificationContainer: HTMLElement | null = null;
  private status: ConnectionStatus;
  private providerType: 'webrtc' | 'colyseus';
  
  // Callbacks
  public onCreateSession: () => void = () => {};
  public onJoinSession: (connectionData: string) => void = () => {};
  public onDisconnect: () => void = () => {};

  constructor(providerType: 'webrtc' | 'colyseus') {
    this.providerType = providerType;
    this.status = { state: 'disconnected' };
    
    // Create container for all UI elements
    this.container = document.createElement('div');
    this.container.id = 'multiplayer-ui-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;
    
    document.body.appendChild(this.container);
    
    // Create status indicator
    this.createStatusIndicator();
    
    // Create notification container
    this.createNotificationContainer();
  }

  /**
   * Create the status indicator that shows connection state and latency
   */
  private createStatusIndicator(): void {
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.id = 'multiplayer-status';
    this.statusIndicator.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      pointer-events: auto;
      display: none;
      min-width: 150px;
    `;
    
    this.container.appendChild(this.statusIndicator);
  }

  /**
   * Create the notification container for game events
   */
  private createNotificationContainer(): void {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'multiplayer-notifications';
    this.notificationContainer.style.cssText = `
      position: absolute;
      top: 80px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    
    this.container.appendChild(this.notificationContainer);
  }

  /**
   * Show the connection modal
   */
  public show(): void {
    if (this.modal) {
      this.modal.style.display = 'flex';
      return;
    }
    
    this.createModal();
  }

  /**
   * Hide the connection modal
   */
  public hide(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  /**
   * Create the main connection modal
   */
  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.id = 'multiplayer-modal';
    this.modal.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #1a1a1a;
      color: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    modalContent.innerHTML = `
      <h2 style="margin-top: 0; color: #00ffaa;">Multiplayer Connection</h2>
      <p style="color: #aaa; margin-bottom: 20px;">
        ${this.providerType === 'webrtc' 
          ? 'Connect with a friend using peer-to-peer WebRTC (no server required)'
          : 'Connect to the Colyseus server to play with others'}
      </p>
      
      <div id="connection-options" style="display: flex; gap: 15px; margin-bottom: 20px;">
        <button id="create-session-btn" style="
          flex: 1;
          padding: 15px;
          background: #00ffaa;
          color: black;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        ">Create Session</button>
        
        <button id="join-session-btn" style="
          flex: 1;
          padding: 15px;
          background: #0088ff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        ">Join Session</button>
      </div>
      
      <div id="provider-panel" style="display: none;"></div>
      
      <div style="margin-top: 20px; text-align: right;">
        <button id="close-modal-btn" style="
          padding: 10px 20px;
          background: #444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        ">Close</button>
      </div>
    `;
    
    this.modal.appendChild(modalContent);
    this.container.appendChild(this.modal);
    
    // Add event listeners
    this.setupModalEventListeners();
  }

  /**
   * Setup event listeners for modal buttons
   */
  private setupModalEventListeners(): void {
    const createBtn = this.modal?.querySelector('#create-session-btn') as HTMLButtonElement;
    const joinBtn = this.modal?.querySelector('#join-session-btn') as HTMLButtonElement;
    const closeBtn = this.modal?.querySelector('#close-modal-btn') as HTMLButtonElement;
    
    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateSession());
      createBtn.addEventListener('mouseenter', () => {
        createBtn.style.background = '#00dd99';
      });
      createBtn.addEventListener('mouseleave', () => {
        createBtn.style.background = '#00ffaa';
      });
    }
    
    if (joinBtn) {
      joinBtn.addEventListener('click', () => this.handleJoinSession());
      joinBtn.addEventListener('mouseenter', () => {
        joinBtn.style.background = '#0077dd';
      });
      joinBtn.addEventListener('mouseleave', () => {
        joinBtn.style.background = '#0088ff';
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#555';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = '#444';
      });
    }
  }

  /**
   * Handle create session button click
   */
  private handleCreateSession(): void {
    const panel = this.modal?.querySelector('#provider-panel') as HTMLElement;
    if (!panel) return;
    
    panel.style.display = 'block';
    
    if (this.providerType === 'webrtc') {
      panel.innerHTML = `
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #00ffaa;">Creating Session...</h3>
          <p style="color: #aaa;">Generating connection offer. Please wait...</p>
          <div id="offer-display" style="display: none;">
            <p style="color: #aaa; margin-bottom: 10px;">
              Share this offer data with your friend:
            </p>
            <textarea id="offer-data" readonly style="
              width: 100%;
              height: 120px;
              background: #1a1a1a;
              color: #00ffaa;
              border: 1px solid #00ffaa;
              border-radius: 6px;
              padding: 10px;
              font-family: monospace;
              font-size: 12px;
              resize: vertical;
              box-sizing: border-box;
            "></textarea>
            <button id="copy-offer-btn" style="
              margin-top: 10px;
              padding: 10px 20px;
              background: #00ffaa;
              color: black;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Copy to Clipboard</button>
            
            <hr style="border: none; border-top: 1px solid #444; margin: 20px 0;">
            
            <h4 style="color: #00ffaa;">Waiting for Answer</h4>
            <p style="color: #aaa; margin-bottom: 10px;">
              Paste the answer data from your friend:
            </p>
            <textarea id="answer-input" placeholder="Paste answer data here..." style="
              width: 100%;
              height: 100px;
              background: #1a1a1a;
              color: white;
              border: 1px solid #666;
              border-radius: 6px;
              padding: 10px;
              font-family: monospace;
              font-size: 12px;
              resize: vertical;
              box-sizing: border-box;
            "></textarea>
            <button id="submit-answer-btn" style="
              margin-top: 10px;
              padding: 10px 20px;
              background: #0088ff;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Connect</button>
          </div>
        </div>
      `;
    } else {
      // Colyseus
      panel.innerHTML = `
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #00ffaa;">Creating Room...</h3>
          <p style="color: #aaa;">Connecting to server. Please wait...</p>
          <div id="room-display" style="display: none;">
            <p style="color: #aaa; margin-bottom: 10px;">
              Share this Room ID with your friend:
            </p>
            <div style="
              background: #1a1a1a;
              color: #00ffaa;
              border: 1px solid #00ffaa;
              border-radius: 6px;
              padding: 15px;
              font-family: monospace;
              font-size: 18px;
              text-align: center;
              font-weight: bold;
              margin-bottom: 10px;
            " id="room-id-display"></div>
            <button id="copy-room-btn" style="
              width: 100%;
              padding: 10px 20px;
              background: #00ffaa;
              color: black;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Copy Room ID</button>
          </div>
        </div>
      `;
    }
    
    // Trigger the create session callback
    this.onCreateSession();
  }

  /**
   * Handle join session button click
   */
  private handleJoinSession(): void {
    const panel = this.modal?.querySelector('#provider-panel') as HTMLElement;
    if (!panel) return;
    
    panel.style.display = 'block';
    
    if (this.providerType === 'webrtc') {
      panel.innerHTML = `
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #0088ff;">Join Session</h3>
          <p style="color: #aaa; margin-bottom: 10px;">
            Paste the offer data from your friend:
          </p>
          <textarea id="offer-input" placeholder="Paste offer data here..." style="
            width: 100%;
            height: 120px;
            background: #1a1a1a;
            color: white;
            border: 1px solid #666;
            border-radius: 6px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            resize: vertical;
            box-sizing: border-box;
            margin-bottom: 10px;
          "></textarea>
          <button id="submit-offer-btn" style="
            padding: 10px 20px;
            background: #0088ff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
          ">Generate Answer</button>
          
          <div id="answer-display" style="display: none; margin-top: 20px;">
            <hr style="border: none; border-top: 1px solid #444; margin: 20px 0;">
            <h4 style="color: #00ffaa;">Answer Generated</h4>
            <p style="color: #aaa; margin-bottom: 10px;">
              Send this answer data back to your friend:
            </p>
            <textarea id="answer-data" readonly style="
              width: 100%;
              height: 120px;
              background: #1a1a1a;
              color: #00ffaa;
              border: 1px solid #00ffaa;
              border-radius: 6px;
              padding: 10px;
              font-family: monospace;
              font-size: 12px;
              resize: vertical;
              box-sizing: border-box;
            "></textarea>
            <button id="copy-answer-btn" style="
              margin-top: 10px;
              padding: 10px 20px;
              background: #00ffaa;
              color: black;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Copy to Clipboard</button>
            <p style="color: #aaa; margin-top: 15px; font-size: 13px;">
              ⏳ Waiting for connection to establish...
            </p>
          </div>
        </div>
      `;
      
      // Setup submit offer button
      const submitBtn = panel.querySelector('#submit-offer-btn') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const offerInput = panel.querySelector('#offer-input') as HTMLTextAreaElement;
          if (offerInput && offerInput.value.trim()) {
            this.onJoinSession(offerInput.value.trim());
          }
        });
      }
    } else {
      // Colyseus
      panel.innerHTML = `
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #0088ff;">Join Room</h3>
          <p style="color: #aaa; margin-bottom: 10px;">
            Enter the Room ID from your friend:
          </p>
          <input type="text" id="room-id-input" placeholder="Enter Room ID..." style="
            width: 100%;
            padding: 15px;
            background: #1a1a1a;
            color: white;
            border: 1px solid #666;
            border-radius: 6px;
            font-family: monospace;
            font-size: 16px;
            box-sizing: border-box;
            margin-bottom: 10px;
          ">
          <button id="submit-room-btn" style="
            width: 100%;
            padding: 12px 20px;
            background: #0088ff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
          ">Join Room</button>
        </div>
      `;
      
      // Setup submit room button
      const submitBtn = panel.querySelector('#submit-room-btn') as HTMLButtonElement;
      const roomInput = panel.querySelector('#room-id-input') as HTMLInputElement;
      
      if (submitBtn && roomInput) {
        const handleSubmit = () => {
          if (roomInput.value.trim()) {
            this.onJoinSession(roomInput.value.trim());
          }
        };
        
        submitBtn.addEventListener('click', handleSubmit);
        roomInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        });
      }
    }
  }

  /**
   * Show WebRTC signal data (offer or answer)
   */
  public showWebRTCSignalData(data: string, type: 'offer' | 'answer'): void {
    if (this.providerType !== 'webrtc') return;
    
    const panel = this.modal?.querySelector('#provider-panel') as HTMLElement;
    if (!panel) return;
    
    if (type === 'offer') {
      // Show offer data in create session flow
      const offerDisplay = panel.querySelector('#offer-display') as HTMLElement;
      const offerData = panel.querySelector('#offer-data') as HTMLTextAreaElement;
      const copyBtn = panel.querySelector('#copy-offer-btn') as HTMLButtonElement;
      const submitAnswerBtn = panel.querySelector('#submit-answer-btn') as HTMLButtonElement;
      const answerInput = panel.querySelector('#answer-input') as HTMLTextAreaElement;
      
      if (offerDisplay && offerData) {
        offerDisplay.style.display = 'block';
        offerData.value = data;
        
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(data);
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
          });
        }
        
        if (submitAnswerBtn && answerInput) {
          submitAnswerBtn.addEventListener('click', () => {
            if (answerInput.value.trim()) {
              this.onJoinSession(answerInput.value.trim());
            }
          });
        }
      }
    } else {
      // Show answer data in join session flow
      const answerDisplay = panel.querySelector('#answer-display') as HTMLElement;
      const answerData = panel.querySelector('#answer-data') as HTMLTextAreaElement;
      const copyBtn = panel.querySelector('#copy-answer-btn') as HTMLButtonElement;
      
      if (answerDisplay && answerData) {
        answerDisplay.style.display = 'block';
        answerData.value = data;
        
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(data);
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
          });
        }
      }
    }
  }

  /**
   * Show Colyseus room ID
   */
  public showColyseusRoomId(roomId: string): void {
    if (this.providerType !== 'colyseus') return;
    
    const panel = this.modal?.querySelector('#provider-panel') as HTMLElement;
    if (!panel) return;
    
    const roomDisplay = panel.querySelector('#room-display') as HTMLElement;
    const roomIdDisplay = panel.querySelector('#room-id-display') as HTMLElement;
    const copyBtn = panel.querySelector('#copy-room-btn') as HTMLButtonElement;
    
    if (roomDisplay && roomIdDisplay) {
      roomDisplay.style.display = 'block';
      roomIdDisplay.textContent = roomId;
      
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(roomId);
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Room ID';
          }, 2000);
        });
      }
    }
  }

  /**
   * Update connection status
   */
  public updateStatus(status: ConnectionStatus): void {
    this.status = status;
    
    if (!this.statusIndicator) return;
    
    // Show/hide status indicator based on state
    if (status.state === 'disconnected') {
      this.statusIndicator.style.display = 'none';
      return;
    }
    
    this.statusIndicator.style.display = 'block';
    
    // Update status indicator content
    let statusColor = '#aaa';
    let statusText = '';
    let statusIcon = '';
    
    switch (status.state) {
      case 'connecting':
        statusColor = '#ffaa00';
        statusText = 'Connecting...';
        statusIcon = '⏳';
        break;
      case 'connected':
        statusColor = '#00ffaa';
        statusText = 'Connected';
        statusIcon = '✓';
        break;
      case 'error':
        statusColor = '#ff4444';
        statusText = 'Error';
        statusIcon = '✗';
        break;
    }
    
    let html = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">${statusIcon}</span>
        <div style="flex: 1;">
          <div style="color: ${statusColor}; font-weight: bold;">${statusText}</div>
          ${status.message ? `<div style="font-size: 12px; color: #aaa; margin-top: 2px;">${status.message}</div>` : ''}
          ${status.latency !== undefined ? `<div style="font-size: 12px; color: #aaa; margin-top: 2px;">Latency: ${status.latency}ms</div>` : ''}
        </div>
      </div>
    `;
    
    // Add disconnect button when connected
    if (status.state === 'connected') {
      html += `
        <button id="disconnect-btn" style="
          margin-top: 10px;
          width: 100%;
          padding: 8px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        ">Disconnect</button>
      `;
    }
    
    this.statusIndicator.innerHTML = html;
    
    // Setup disconnect button
    const disconnectBtn = this.statusIndicator.querySelector('#disconnect-btn') as HTMLButtonElement;
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        this.onDisconnect();
      });
      disconnectBtn.addEventListener('mouseenter', () => {
        disconnectBtn.style.background = '#dd3333';
      });
      disconnectBtn.addEventListener('mouseleave', () => {
        disconnectBtn.style.background = '#ff4444';
      });
    }
    
    // Hide modal when connected
    if (status.state === 'connected') {
      this.hide();
    }
  }

  /**
   * Show a notification message
   */
  public showNotification(message: string, duration: number = 3000): void {
    if (!this.notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0, 255, 170, 0.9);
      color: black;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
      max-width: 300px;
    `;
    
    notification.textContent = message;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.notificationContainer.appendChild(notification);
    
    // Remove notification after duration
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (this.notificationContainer && notification.parentNode === this.notificationContainer) {
          this.notificationContainer.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  /**
   * Clean up and remove UI elements
   */
  public dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remove animation styles
    const animationStyles = document.querySelector('#notification-animations');
    if (animationStyles && animationStyles.parentNode) {
      animationStyles.parentNode.removeChild(animationStyles);
    }
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }
}
