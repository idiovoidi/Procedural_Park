import type { ConnectionStatus } from '../types'
import { CONNECTION_UI_CSS } from './connection-ui-styles'

/**
 * ConnectionUI manages the user interface for WebRTC multiplayer connections
 * Provides modal overlay for connection management and status indicators
 */
export class ConnectionUI {
  private container: HTMLElement
  private modal: HTMLElement | null = null
  private status: ConnectionStatus = { state: 'disconnected' }
  private statusIndicator: HTMLElement | null = null
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
    style.textContent = CONNECTION_UI_CSS
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
        if (action) {
          this.handleAction(action)
        }
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
    flows.forEach((f) => {
      f.classList.remove('active')
    })

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
    } catch (_error) {
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
    } catch (_error) {
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
        case 'connected': {
          icon.textContent = '✅'
          const latency = status.latency !== undefined ? ` (${status.latency}ms)` : ''
          text.textContent = `Multiplayer: Connected${latency}`
          break
        }
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
