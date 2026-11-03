/**
 * Trade panel
 * Modal for trading creatures with a connected friend: pick one of yours to offer, answer the
 * friend's offers, and see what is still waiting. Pure view: it renders what it is given.
 */

import type { UICallbacks } from '@core/types'

export interface TradeCreatureRow {
  id: string
  name: string
  description: string
  /** Why it cannot be offered right now (empty when it can). */
  blocked: string
}

export interface TradeOfferRow {
  id: string
  name: string
  description: string
  accepted: boolean
}

export interface TradePanelView {
  connected: boolean
  mine: TradeCreatureRow[]
  /** Offers I have made that the friend has not answered. */
  outgoing: Array<{ id: string; name: string }>
  /** The friend's offers to me. */
  incoming: TradeOfferRow[]
}

export interface TradePanelCallbacks {
  onOffer: (creatureId: string) => void
  onCancel: (offerId: string) => void
  onAccept: (offerId: string) => void
  onDecline: (offerId: string) => void
}

const STYLE = `
  #trade-panel .tp-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  #trade-panel .tp-name { font-weight: bold; }
  #trade-panel .tp-sub, #trade-panel .tp-none { color: #9aa3b8; font-size: 12px; }
  #trade-panel .tp-actions { display: flex; gap: 6px; }
  #trade-panel h3 { margin: 14px 0 4px; }
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

export class TradePanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: TradePanelCallbacks = {
    onOffer: () => {},
    onCancel: () => {},
    onAccept: () => {},
    onDecline: () => {},
  }
  private lastView: TradePanelView | null = null
  private signature = ''

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'trade-panel'
    this.container.style.display = 'none'

    const modal = el('div', 'market-modal')
    const header = el('div', 'market-header')
    header.append(el('h2', undefined, '🤝 Trade'))
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

    if (!document.getElementById('trade-panel-styles')) {
      const style = document.createElement('style')
      style.id = 'trade-panel-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: TradePanelCallbacks): void {
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

  public render(view: TradePanelView): void {
    this.lastView = view
    if (!this.open_) return
    const signature = JSON.stringify(view)
    if (signature === this.signature) return
    this.signature = signature

    const button = (label: string, onClick: () => void, disabled = false) => {
      const b = el('button', 'market-btn', label)
      b.disabled = disabled
      b.addEventListener('click', () => {
        this.audio.onClick?.()
        onClick()
      })
      return b
    }
    const row = (name: string, sub: string, ...actions: HTMLElement[]) => {
      const r = el('div', 'tp-row')
      const left = el('div')
      left.append(el('div', 'tp-name', name), el('div', 'tp-sub', sub))
      const right = el('div', 'tp-actions')
      right.append(...actions)
      r.append(left, right)
      return r
    }

    const nodes: HTMLElement[] = []
    if (!view.connected) {
      nodes.push(
        el(
          'p',
          'tp-none',
          'Not connected. Open Multiplayer (🌐) and connect to a friend first; trades go over the same direct link.'
        )
      )
    }

    nodes.push(el('h3', undefined, 'Offers from your friend'))
    if (view.incoming.length === 0) nodes.push(el('p', 'tp-none', 'None right now.'))
    for (const o of view.incoming) {
      nodes.push(
        o.accepted
          ? row(o.name, `${o.description} · waiting for your friend to hand it over`)
          : row(
              o.name,
              o.description,
              button('Accept', () => this.callbacks.onAccept(o.id)),
              button('Decline', () => this.callbacks.onDecline(o.id))
            )
      )
    }

    nodes.push(el('h3', undefined, 'Your offers'))
    if (view.outgoing.length === 0) nodes.push(el('p', 'tp-none', 'None waiting.'))
    for (const o of view.outgoing) {
      nodes.push(
        row(
          o.name,
          'waiting for an answer',
          button('Cancel', () => this.callbacks.onCancel(o.id))
        )
      )
    }

    nodes.push(el('h3', undefined, 'Offer one of yours'))
    if (view.mine.length === 0) nodes.push(el('p', 'tp-none', 'You have no creatures yet.'))
    for (const c of view.mine) {
      nodes.push(
        row(
          c.name,
          c.blocked || c.description,
          button('Offer', () => this.callbacks.onOffer(c.id), !view.connected || Boolean(c.blocked))
        )
      )
    }
    this.body.replaceChildren(...nodes)
  }
}
