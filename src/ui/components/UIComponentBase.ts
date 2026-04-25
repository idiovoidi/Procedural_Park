import type { UICallbacks } from '@core/types'

/**
 * Base class for UI components with common visibility and lifecycle management
 */
export abstract class UIComponentBase {
  protected container: HTMLDivElement
  protected isVisible: boolean = false
  protected audioCallbacks: UICallbacks = {}
  protected abstract displayStyle: string

  constructor() {
    this.container = this.createContainer()
    document.body.appendChild(this.container)
  }

  protected abstract createContainer(): HTMLDivElement

  public show(): void {
    this.isVisible = true
    this.container.style.display = this.displayStyle
    this.onShow()
  }

  protected onShow(): void {
    // Override in subclass if needed
  }

  public hide(): void {
    this.isVisible = false
    this.container.style.display = 'none'
    this.onHide()
  }

  protected onHide(): void {
    // Override in subclass if needed
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  public isOpen(): boolean {
    return this.isVisible
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audioCallbacks = callbacks
  }

  public dispose(): void {
    this.hide()
    if (this.container.parentNode) {
      document.body.removeChild(this.container)
    }
    this.onDispose()
  }

  protected onDispose(): void {
    // Override in subclass if needed
  }
}
