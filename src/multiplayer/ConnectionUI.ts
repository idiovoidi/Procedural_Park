import type { ConnectionStatus } from './types'

/**
 * ConnectionUI manages the user interface for WebRTC multiplayer connections
 * Provides modal overlay for connection management and status indicators
 */
export class ConnectionUI {
  private container: HTMLElement
  private modal: HTMLElement | null = null
  private status: ConnectionStatus = { state: 'disconnected' }
  private statusIndicator: HTMLElement | null = null
  private signalDataContainer: HTMLElement | null = null
  private notificationContainer: HTMLElement | null = null

  // Callbacks for user interactions
  public onCreateSession: () => void = () => {}
  public onJoinSession: (offerData: string) => void = () => {}
  public onAnswerProvided: (answerData: string) => void = () => {}
  public onDisconnect: () => void = () => {}

  constructor() {
    this.container = document.body
    this.createStatusIndicator()
    this.injectStyles()
  }

  /**
   * Inject CSS styles for the multiplayer UI
   */
  private injectStyles(): void {
    if (document.getElementById('multiplayer-ui-styles')) return

    const style = document.createElement('style')
    style.id = 'multiplayer-ui-styles'
    style.textContent = `
      .mp-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(4px);
      }

      .mp-modal {
        background: rgba(27, 36, 48, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .mp-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .mp-modal-header h2 {
        margin: 0;
        color: #e8e8e8;
        font-size: 1.5em;
      }

      .mp-close-btn {
        background: transparent;
        border: none;
        color: #e8e8e8;
        font-size: 1.8em;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        line-height: 1;
      }

      .mp-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .mp-modal-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .mp-button-group {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .mp-button {
        flex: 1;
        background: #1b2430;
        color: #e8e8e8;
        border: 1px solid #2a384a;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1em;
        font-weight: 500;
        transition: all 0.2s;
      }

      .mp-button:hover {
        background: #2a384a;
        border-color: #6cf;
      }

      .mp-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .mp-button.primary {
        background: #6cf;
        color: #0b0f16;
        border-color: #6cf;
      }

      .mp-button.primary:hover {
        background: #5bc;
      }

      .mp-button.danger {
        background: #dc2626;
        border-color: #dc2626;
        color: white;
      }

      .mp-button.danger:hover {
        background: #b91c1c;
      }

      .mp-input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mp-input-group label {
        color: #e8e8e8;
        font-size: 0.9em;
        font-weight: 500;
      }

      .mp-input-group textarea {
        background: #0b0f16;
        color: #e8e8e8;
        border: 1px solid #2a384a;
        border-radius: 6px;
        padding: 10px;
        font-family: monospace;
        font-size: 0.85em;
        resize: vertical;
        min-height: 80px;
      }

      .mp-input-group textarea:focus {
        outline: none;
        border-color: #6cf;
      }

      .mp-signal-data {
        background: #0b0f16;
        border: 1px solid #2a384a;
        border-radius: 6px;
        padding: 12px;
        margin-top: 8px;
      }

      .mp-signal-data-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .mp-signal-data-header span {
        color: #6cf;
        font-weight: 500;
        font-size: 0.9em;
      }

      .mp-copy-btn {
        background: #1b2430;
        color: #e8e8e8;
        border: 1px solid #2a384a;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85em;
      }

      .mp-copy-btn:hover {
        background: #2a384a;
      }

      .mp-signal-data-content {
        background: #000;
        color: #6cf;
        padding: 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.75em;
        word-break: break-all;
        max-height: 120px;
        overflow-y: auto;
      }

      .mp-status-indicator {
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 1999;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
        pointer-events: none;
      }

      .mp-status-indicator.disconnected {
        background: rgba(107, 114, 128, 0.8);
        border-color: rgba(107, 114, 128, 0.5);
      }

      .mp-status-indicator.connecting {
        background: rgba(59, 130, 246, 0.8);
        border-color: rgba(59, 130, 246, 0.5);
      }

      .mp-status-indicator.connected {
        background: rgba(34, 197, 94, 0.8);
        border-color: rgba(34, 197, 94, 0.5);
      }

      .mp-status-indicator.error {
        background: rgba(220, 38, 38, 0.8);
        border-color: rgba(220, 38, 38, 0.5);
      }

      .mp-status-icon {
        font-size: 14px;
      }

      .mp-notification {
        position: fixed;
        top: 120px;
        right: 20px;
        background: rgba(102, 204, 255, 0.95);
        color: #0b0f16;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 2001;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease-out;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .mp-info-text {
        color: #9ca3af;
        font-size: 0.85em;
        line-height: 1.4;
        margin-top: 8px;
      }

      .mp-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 16px 0;
      }

      .mp-flow-container {
        display: none;
      }

      .mp-flow-container.active {
        display: block;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Create the status indicator that shows connection state
   */
  private createStatusIndicator(): void {
    const indicator = document.createElement('div')
    indicator.className = 'mp-status-indicator disconnected'
    indicator.innerHTML = `
      <span class="mp-status-icon">🔌</span>
      <span class="mp-status-text">Multiplayer: Offline</span>
    `
    this.container.appendChild(indicator)
    this.statusIndicator = indicator
  }

  /**
   * Show the connection modal
   */
  public show(): void {
    if (this.modal) return

    const overlay = document.createElement('div')
    overlay.className = 'mp-modal-overlay'
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide()
      }
    })

    const modal = document.createElement('div')
    modal.className = 'mp-modal'
    modal.innerHTML = this.createModalContent()

    overlay.appendChild(modal)
    this.container.appendChild(overlay)
    this.modal = overlay

    this.attachEventListeners()
  }

  /**
   * Create the modal content HTML
   */
  private createModalContent(): string {
    const isConnected = this.status.state === 'connected'

    return `
      <div class="mp-modal-header">
        <h2>🌐 Multiplayer</h2>
        <button class="mp-close-btn" data-action="close">&times;</button>
      </div>
      <div class="mp-modal-content">
        ${
          isConnected
            ? this.createConnectedView()
            : `
          <div class="mp-button-group">
            <button class="mp-button" data-action="show-host">Create Session</button>
            <button class="mp-button" data-action="show-guest">Join Session</button>
          </div>

          <div class="mp-flow-container" data-flow="host">
            ${this.createHostFlow()}
          </div>

          <div class="mp-flow-container" data-flow="guest">
            ${this.createGuestFlow()}
          </div>
        `
        }
      </div>
    `
  }

  /**
   * Create the host flow UI
   */
  private createHostFlow(): string {
    return `
      <div class="mp-divider"></div>
      <h3 style="color: #e8e8e8; margin: 0 0 12px 0;">Host a Session</h3>
      <p class="mp-info-text">
        Click "Generate Offer" to create a connection code. Share this code with your friend.
      </p>
      <button class="mp-button primary" data-action="create-session">Generate Offer</button>
      
      <div id="host-signal-container"></div>
      
      <div id="host-answer-input" style="display: none;">
        <div class="mp-divider"></div>
        <div class="mp-input-group">
          <label>Paste Answer from Friend:</label>
          <textarea id="answer-input" placeholder="Paste the answer code here..."></textarea>
        </div>
        <button class="mp-button primary" data-action="submit-answer">Connect</button>
      </div>
    `
  }

  /**
   * Create the guest flow UI
   */
  private createGuestFlow(): string {
    return `
      <div class="mp-divider"></div>
      <h3 style="color: #e8e8e8; margin: 0 0 12px 0;">Join a Session</h3>
      <p class="mp-info-text">
        Paste the offer code from your friend below to generate your answer code.
      </p>
      <div class="mp-input-group">
        <label>Paste Offer from Friend:</label>
        <textarea id="offer-input" placeholder="Paste the offer code here..."></textarea>
      </div>
      <button class="mp-button primary" data-action="join-session">Generate Answer</button>
      
      <div id="guest-signal-container"></div>
    `
  }

  /**
   * Create the connected view
   */
  private createConnectedView(): string {
    const latencyText = this.status.latency !== undefined ? `${this.status.latency}ms` : 'N/A'
    return `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 3em; margin-bottom: 12px;">✅</div>
        <h3 style="color: #22c55e; margin: 0 0 8px 0;">Connected!</h3>
        <p class="mp-info-text">You are now connected to your friend.</p>
        <p class="mp-info-text">Latency: ${latencyText}</p>
      </div>
      <div class="mp-divider"></div>
      <button class="mp-button danger" data-action="disconnect">Disconnect</button>
    `
  }

  /**
   * Attach event listeners to modal elements
   */
  private attachEventListeners(): void {
    if (!this.modal) return

    this.modal.querySelectorAll('[data-action]').forEach((element) => {
      element.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action
        this.handleAction(action!)
      })
    })
  }

  /**
   * Handle button actions
   */
  private handleAction(action: string): void {
    switch (action) {
      case 'close':
        this.hide()
        break
      case 'show-host':
        this.showFlow('host')
        break
      case 'show-guest':
        this.showFlow('guest')
        break
      case 'create-session':
        this.onCreateSession()
        break
      case 'join-session':
        this.handleJoinSession()
        break
      case 'submit-answer':
        this.handleSubmitAnswer()
        break
      case 'disconnect':
        this.onDisconnect()
        this.hide()
        break
    }
  }

  /**
   * Show a specific flow (host or guest)
   */
  private showFlow(flow: 'host' | 'guest'): void {
    if (!this.modal) return

    const flows = this.modal.querySelectorAll('.mp-flow-container')
    flows.forEach((f) => f.classList.remove('active'))

    const targetFlow = this.modal.querySelector(`[data-flow="${flow}"]`)
    targetFlow?.classList.add('active')
  }

  /**
   * Handle join session action
   */
  private handleJoinSession(): void {
    if (!this.modal) return

    const input = this.modal.querySelector('#offer-input') as HTMLTextAreaElement
    const offerData = input?.value.trim()

    if (!offerData) {
      this.showNotification('⚠️ Please paste an offer code', 3000)
      return
    }

    try {
      // Validate JSON
      JSON.parse(offerData)
      this.onJoinSession(offerData)
    } catch (error) {
      this.showNotification('❌ Invalid offer code format', 3000)
    }
  }

  /**
   * Handle submit answer action
   */
  private handleSubmitAnswer(): void {
    if (!this.modal) return

    const input = this.modal.querySelector('#answer-input') as HTMLTextAreaElement
    const answerData = input?.value.trim()

    if (!answerData) {
      this.showNotification('⚠️ Please paste an answer code', 3000)
      return
    }

    try {
      // Validate JSON
      JSON.parse(answerData)
      this.onAnswerProvided(answerData)
    } catch (error) {
      this.showNotification('❌ Invalid answer code format', 3000)
    }
  }

  /**
   * Hide the connection modal
   */
  public hide(): void {
    if (this.modal) {
      this.container.removeChild(this.modal)
      this.modal = null
    }
  }

  /**
   * Dispose of the UI and clean up
   */
  public dispose(): void {
    this.hide()
    if (this.statusIndicator) {
      this.container.removeChild(this.statusIndicator)
      this.statusIndicator = null
    }
    if (this.notificationContainer) {
      this.container.removeChild(this.notificationContainer)
      this.notificationContainer = null
    }
  }

  /**
   * Update the connection status
   */
  public updateStatus(status: ConnectionStatus): void {
    this.status = status

    if (this.statusIndicator) {
      const icon = this.statusIndicator.querySelector('.mp-status-icon') as HTMLElement
      const text = this.statusIndicator.querySelector('.mp-status-text') as HTMLElement

      // Remove all state classes
      this.statusIndicator.classList.remove('disconnected', 'connecting', 'connected', 'error')
      this.statusIndicator.classList.add(status.state)

      switch (status.state) {
        case 'disconnected':
          icon.textContent = '🔌'
          text.textContent = 'Multiplayer: Offline'
          break
        case 'connecting':
          icon.textContent = '🔄'
          text.textContent = 'Multiplayer: Connecting...'
          break
        case 'connected':
          icon.textContent = '✅'
          const latency = status.latency !== undefined ? ` (${status.latency}ms)` : ''
          text.textContent = `Multiplayer: Connected${latency}`
          break
        case 'error':
          icon.textContent = '❌'
          text.textContent = `Multiplayer: Error`
          break
      }
    }

    // Update modal if it's open
    if (this.modal && status.state === 'connected') {
      this.refreshModal()
    }
  }

  /**
   * Refresh the modal content
   */
  private refreshModal(): void {
    if (!this.modal) return

    const modalContent = this.modal.querySelector('.mp-modal')
    if (modalContent) {
      modalContent.innerHTML = this.createModalContent()
      this.attachEventListeners()
    }
  }

  /**
   * Show signal data (offer or answer) in the modal
   */
  public showSignalData(data: string, type: 'offer' | 'answer'): void {
    if (!this.modal) return

    const containerId = type === 'offer' ? 'host-signal-container' : 'guest-signal-container'
    const container = this.modal.querySelector(`#${containerId}`)

    if (!container) return

    const label = type === 'offer' ? 'Your Offer Code' : 'Your Answer Code'
    const instruction =
      type === 'offer'
        ? 'Share this code with your friend. Then paste their answer below.'
        : 'Share this code with your friend to complete the connection.'

    container.innerHTML = `
      <div class="mp-divider"></div>
      <div class="mp-signal-data">
        <div class="mp-signal-data-header">
          <span>${label}</span>
          <button class="mp-copy-btn" data-copy="${data}">Copy</button>
        </div>
        <div class="mp-signal-data-content">${data}</div>
      </div>
      <p class="mp-info-text">${instruction}</p>
    `

    // Attach copy button listener
    const copyBtn = container.querySelector('.mp-copy-btn')
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(data).then(() => {
        this.showNotification('📋 Copied to clipboard!', 2000)
      })
    })

    // Show answer input for host after offer is generated
    if (type === 'offer') {
      const answerInput = this.modal.querySelector('#host-answer-input') as HTMLElement
      if (answerInput) {
        answerInput.style.display = 'block'
      }
    }
  }

  /**
   * Show a notification message
   */
  public showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div')
    notification.className = 'mp-notification'
    notification.textContent = message

    this.container.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in'
      setTimeout(() => {
        if (notification.parentNode) {
          this.container.removeChild(notification)
        }
      }, 300)
    }, duration)
  }
}
