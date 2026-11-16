/**
 * Staff panel
 * Modal listing the pens with their keeper (or none), with Hire and Dismiss buttons. Pure view.
 */

import type { UICallbacks } from '@core/types'

export interface StaffPenRow {
  penId: string
  residents: number
  keeper: boolean
  unpaid: boolean
}

export interface StaffPanelView {
  pens: StaffPenRow[]
  hireCost: number
  wage: number
  balance: number
}

export interface StaffPanelCallbacks {
  onHire: (penId: string) => void
  onDismiss: (penId: string) => void
}

const STYLE = `
  #staff-panel .sp-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  #staff-panel .sp-sub, #staff-panel .sp-none { color: #9aa3b8; font-size: 12px; }
  #staff-panel .sp-warn { color: #ffb36b; font-size: 12px; }
  #staff-panel .sp-name { font-weight: bold; }
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

export class StaffPanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: StaffPanelCallbacks = { onHire: () => {}, onDismiss: () => {} }
  private lastView: StaffPanelView | null = null
  private signature = ''

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'staff-panel'
    this.container.style.display = 'none'
    const modal = el('div', 'market-modal')
    const header = el('div', 'market-header')
    header.append(el('h2', undefined, '🧑‍🌾 Keepers'))
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
    if (!document.getElementById('staff-panel-styles')) {
      const style = document.createElement('style')
      style.id = 'staff-panel-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: StaffPanelCallbacks): void {
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

  public render(view: StaffPanelView): void {
    this.lastView = view
    if (!this.open_) return
    const signature = JSON.stringify(view)
    if (signature === this.signature) return
    this.signature = signature

    const nodes: HTMLElement[] = [
      el(
        'p',
        'sp-none',
        `A keeper (🪙 ${view.hireCost} to hire, 🪙 ${view.wage} a minute) restocks the troughs from your bag or by buying food, empties the bin and cheers the creatures up. You still decide everything else.`
      ),
    ]
    if (view.pens.length === 0) nodes.push(el('p', 'sp-none', 'Build a closed pen first.'))
    for (const p of view.pens) {
      const row = el('div', 'sp-row')
      const left = el('div')
      left.append(
        el('div', 'sp-name', p.penId),
        el('div', 'sp-sub', `${p.residents} creature${p.residents === 1 ? '' : 's'}`)
      )
      if (p.keeper && p.unpaid) left.append(el('div', 'sp-warn', 'Keeper unpaid: not working'))
      const button = el('button', 'market-btn', p.keeper ? 'Dismiss' : 'Hire')
      button.disabled = !p.keeper && view.balance < view.hireCost
      button.addEventListener('click', () => {
        this.audio.onClick?.()
        if (p.keeper) this.callbacks.onDismiss(p.penId)
        else this.callbacks.onHire(p.penId)
      })
      row.append(left, button)
      nodes.push(row)
    }
    this.body.replaceChildren(...nodes)
  }
}
