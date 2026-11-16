/**
 * Map panel
 * Modal listing the hub and the expedition maps: what each holds, what it takes to unlock, and
 * buttons to unlock or travel. Pure view: it renders what it is given and reports clicks.
 */

import type { UICallbacks } from '@core/types'

export interface MapRowView {
  id: string
  name: string
  description: string
  /** What the founders there are like, e.g. "mostly aquatic · rarer founders". */
  note: string
  state: 'here' | 'open' | 'locked'
  /** Why it cannot be unlocked yet (empty when it can be). */
  lockReason: string
  unlockCost: number
  canUnlock: boolean
}

export interface MapPanelView {
  maps: MapRowView[]
}

export interface MapPanelCallbacks {
  onTravel: (mapId: string) => void
  onUnlock: (mapId: string) => void
}

const STYLE = `
  #map-panel .mp-row { border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 12px; margin: 8px 0; }
  #map-panel .mp-row.here { border-color: #ffd700; }
  #map-panel .mp-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  #map-panel .mp-name { font-weight: bold; }
  #map-panel .mp-note, #map-panel .mp-lock { color: #9aa3b8; font-size: 12px; }
  #map-panel .mp-lock { color: #ffb36b; }
  #map-panel .mp-actions { margin-top: 6px; }
`

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export class MapPanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: MapPanelCallbacks = { onTravel: () => {}, onUnlock: () => {} }
  private lastView: MapPanelView | null = null
  private signature = ''

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'map-panel'
    this.container.style.display = 'none'

    const modal = el('div', 'market-modal')
    const header = el('div', 'market-header')
    header.append(el('h2', undefined, '🧭 Expeditions'))
    const close = el('button', 'close-btn', '✕')
    close.addEventListener('click', () => {
      this.audio.onClick?.()
      this.close()
    })
    header.append(close)

    this.body = el('div', 'market-body')
    modal.append(header, this.body)
    this.container.append(modal)
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close()
    })

    if (!document.getElementById('map-panel-styles')) {
      const style = document.createElement('style')
      style.id = 'map-panel-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: MapPanelCallbacks): void {
    this.callbacks = callbacks
  }

  public isOpen(): boolean {
    return this.open_
  }

  public open(): void {
    this.open_ = true
    this.container.style.display = 'flex'
    if (this.lastView) this.render(this.lastView)
  }

  public close(): void {
    this.open_ = false
    this.container.style.display = 'none'
  }

  public toggle(): void {
    if (this.open_) this.close()
    else this.open()
  }

  public render(view: MapPanelView): void {
    this.lastView = view
    if (!this.open_) return
    const signature = view.maps
      .map((m) => `${m.id}:${m.state}:${m.lockReason}:${m.canUnlock}`)
      .join('|')
    if (signature === this.signature) return
    this.signature = signature

    const nodes: HTMLElement[] = [
      el(
        'p',
        'mp-note',
        'Travel to wild maps to find founders the hub never offers. Your ranch keeps running while you are away, but you can only build at the hub.'
      ),
    ]
    for (const m of view.maps) {
      const row = el('div', m.state === 'here' ? 'mp-row here' : 'mp-row')
      row.dataset.map = m.id
      const top = el('div', 'mp-top')
      top.append(el('span', 'mp-name', m.name))
      if (m.state === 'here') top.append(el('span', 'mp-note', 'you are here'))
      row.append(top, el('div', 'mp-note', m.description))
      if (m.note) row.append(el('div', 'mp-note', m.note))

      const actions = el('div', 'mp-actions')
      if (m.state === 'open') {
        const go = el('button', 'market-btn', m.id === 'hub' ? 'Return home' : 'Travel')
        go.addEventListener('click', () => {
          this.audio.onClick?.()
          this.callbacks.onTravel(m.id)
        })
        actions.append(go)
      } else if (m.state === 'locked') {
        const label = m.unlockCost > 0 ? `Unlock 🪙 ${m.unlockCost}` : 'Unlock'
        const unlock = el('button', 'market-btn', label)
        unlock.disabled = !m.canUnlock
        unlock.addEventListener('click', () => {
          this.audio.onClick?.()
          this.callbacks.onUnlock(m.id)
        })
        actions.append(unlock)
        if (m.lockReason) actions.append(el('span', 'mp-lock', ` ${m.lockReason}`))
      }
      row.append(actions)
      nodes.push(row)
    }
    this.body.replaceChildren(...nodes)
  }
}
