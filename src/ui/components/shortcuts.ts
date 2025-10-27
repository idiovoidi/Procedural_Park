import type { UICallbacks } from '@core/types'

export class Shortcuts {
  private shortcutsPanel: HTMLDivElement
  private toggleShortcutsBtn: HTMLButtonElement
  private audioCallbacks: UICallbacks = {}

  constructor() {
    this.shortcutsPanel = document.getElementById('shortcuts-panel') as HTMLDivElement
    this.toggleShortcutsBtn = document.getElementById('toggleShortcuts') as HTMLButtonElement

    this.setupEventListeners()
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
  }

  private setupEventListeners() {
    this.toggleShortcutsBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggle()
    })

    // Shortcuts panel close button
    this.shortcutsPanel.querySelector('.close-btn')?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggle()
    })
  }

  public toggle() {
    this.shortcutsPanel.classList.toggle('hidden')
  }
}
