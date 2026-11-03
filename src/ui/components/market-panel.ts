/**
 * Market Panel
 * Modal for selling resources and creatures. Pure view: it renders the data it is given and
 * reports clicks through callbacks, so it holds no game logic.
 *
 * Text is always set with textContent (never innerHTML) because creature names can come
 * from imported cards.
 */

import type { UICallbacks } from '@core/types'
import { MARKET_PANEL_CSS } from './market-panel-styles'

export interface MarketResourceRow {
  type: string
  label: string
  icon: string
  owned: number
  /** How many units can be held (raised by silos). */
  capacity: number
  /** Coins the next unit would fetch. */
  unitPrice: number
  /** 0..1 */
  demand: number
}

export interface MarketCreatureRow {
  id: string
  name: string
  /** e.g. "aerial · rare · adult" */
  description: string
  value: number
}

export interface MarketView {
  balance: number
  resources: MarketResourceRow[]
  creatures: MarketCreatureRow[]
  /** The auto-sell valve: only shown once one is built. */
  autoSell: { available: boolean; floor: number }
}

export interface MarketPanelCallbacks {
  onSellResource: (type: string, units: number) => void
  onSellAllResources: () => void
  onSellCreature: (id: string) => void
  /** Move the auto-sell price floor up (+1) or down (-1) one step. */
  onNudgeFloor: (direction: 1 | -1) => void
}

const CONFIRM_MS = 3000

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

export class MarketPanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private balanceEl: HTMLSpanElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: MarketPanelCallbacks = {
    onSellResource: () => {},
    onSellAllResources: () => {},
    onSellCreature: () => {},
    onNudgeFloor: () => {},
  }
  /** Creature id awaiting a confirming second click, and when that offer lapses. */
  private pendingSale: { id: string; timer: ReturnType<typeof setTimeout> } | null = null
  private lastView: MarketView | null = null
  /**
   * What the rows on screen were built from. While it is unchanged, `render` only patches
   * values in place: the market ticks every second, and rebuilding the DOM that often would
   * swallow clicks.
   */
  private signature = ''
  private refs: {
    sellAll: HTMLButtonElement | null
    floor: HTMLElement | null
    resources: Map<
      string,
      {
        owned: HTMLElement
        price: HTMLElement
        demand: HTMLElement
        bar: HTMLElement
        sellOne: HTMLButtonElement
        sellMax: HTMLButtonElement
      }
    >
    creatures: Map<string, HTMLElement>
  } = { sellAll: null, floor: null, resources: new Map(), creatures: new Map() }

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'market-panel'
    this.container.style.display = 'none'

    const modal = el('div', 'market-modal')
    const header = el('div', 'market-header')
    header.append(el('h2', undefined, '💰 Market'))
    const balance = el('div', 'market-balance')
    balance.append(el('span', 'market-balance-label', 'Balance:'))
    this.balanceEl = el('span', 'market-balance-amount', '🪙 0')
    balance.append(this.balanceEl)
    header.append(balance)
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

    this.addStyles()
    document.body.appendChild(this.container)
  }

  private addStyles(): void {
    if (document.getElementById('market-panel-styles')) return
    const style = document.createElement('style')
    style.id = 'market-panel-styles'
    style.textContent = MARKET_PANEL_CSS
    document.head.appendChild(style)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: MarketPanelCallbacks): void {
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
    this.cancelPendingSale()
  }

  public toggle(): void {
    if (this.open_) this.close()
    else this.open()
  }

  private cancelPendingSale(): void {
    if (this.pendingSale) clearTimeout(this.pendingSale.timer)
    this.pendingSale = null
  }

  /** Redraw from fresh data. Cheap enough to call on every change while the panel is open. */
  public render(view: MarketView): void {
    this.lastView = view
    this.balanceEl.textContent = `🪙 ${view.balance}`
    if (!this.open_) return

    const signature = [
      this.pendingSale?.id ?? '',
      view.autoSell.available ? 'valve' : 'no-valve',
      ...view.creatures.map((c) => `${c.id}:${c.name}:${c.description}`),
    ].join('|')
    if (signature !== this.signature || this.body.childElementCount === 0) {
      this.signature = signature
      this.body.replaceChildren(this.buildResources(view), this.buildCreatures(view))
      return
    }
    this.patch(view)
  }

  /** Update numbers and enabled states without touching the DOM structure. */
  private patch(view: MarketView): void {
    if (this.refs.sellAll) {
      this.refs.sellAll.disabled = view.resources.every((r) => r.owned === 0)
    }
    if (this.refs.floor) {
      this.refs.floor.textContent = `${Math.round(view.autoSell.floor * 100)}%`
    }
    for (const r of view.resources) {
      const ref = this.refs.resources.get(r.type)
      if (!ref) continue
      ref.owned.textContent = `×${r.owned}/${r.capacity}`
      ref.price.textContent = `🪙 ${r.unitPrice.toFixed(1)} each`
      const pct = `${Math.round(r.demand * 100)}%`
      ref.bar.style.width = pct
      ref.demand.title = `Demand ${pct}`
      ref.sellOne.disabled = r.owned < 1
      ref.sellMax.disabled = r.owned < 1
      ref.sellMax.onclick = () => {
        this.audio.onClick?.()
        this.callbacks.onSellResource(r.type, r.owned)
      }
    }
    for (const c of view.creatures) {
      const price = this.refs.creatures.get(c.id)
      if (price) price.textContent = `🪙 ${c.value}`
    }
  }

  private buildResources(view: MarketView): HTMLElement {
    const section = el('section', 'market-section')
    const head = el('div', 'market-section-head')
    head.append(el('h3', undefined, 'Resources'))
    const sellAll = el('button', 'market-btn', 'Sell all')
    this.refs = { sellAll, floor: null, resources: new Map(), creatures: new Map() }
    sellAll.disabled = view.resources.every((r) => r.owned === 0)
    sellAll.addEventListener('click', () => {
      this.audio.onClick?.()
      this.callbacks.onSellAllResources()
    })
    head.append(sellAll)
    section.append(head)

    if (view.autoSell.available) {
      const row = el('div', 'market-row')
      row.append(el('span', 'market-icon', '🚰'), el('span', 'market-name', 'Auto-sell floor'))
      const down = el('button', 'market-btn', '−')
      const floor = el('span', 'market-owned', `${Math.round(view.autoSell.floor * 100)}%`)
      const up = el('button', 'market-btn', '+')
      down.addEventListener('click', () => {
        this.audio.onClick?.()
        this.callbacks.onNudgeFloor(-1)
      })
      up.addEventListener('click', () => {
        this.audio.onClick?.()
        this.callbacks.onNudgeFloor(1)
      })
      row.append(down, floor, up)
      row.title =
        'Valves sell your stock every minute while the price is at or above this share of base'
      this.refs.floor = floor
      section.append(row)
    }

    for (const r of view.resources) {
      const row = el('div', 'market-row')
      row.append(el('span', 'market-icon', r.icon), el('span', 'market-name', r.label))
      const ownedEl = el('span', 'market-owned', `×${r.owned}/${r.capacity}`)
      const priceEl = el('span', 'market-price', `🪙 ${r.unitPrice.toFixed(1)} each`)
      row.append(ownedEl, priceEl)

      const demand = el('span', 'market-demand')
      demand.title = `Demand ${Math.round(r.demand * 100)}%`
      const bar = el('span', 'market-demand-bar')
      bar.style.width = `${Math.round(r.demand * 100)}%`
      demand.append(bar)
      row.append(demand)

      const sellOne = el('button', 'market-btn', 'Sell 1')
      sellOne.disabled = r.owned < 1
      sellOne.addEventListener('click', () => {
        this.audio.onClick?.()
        this.callbacks.onSellResource(r.type, 1)
      })
      const sellMax = el('button', 'market-btn', 'Sell all')
      sellMax.disabled = r.owned < 1
      sellMax.onclick = () => {
        this.audio.onClick?.()
        this.callbacks.onSellResource(r.type, r.owned)
      }
      row.append(sellOne, sellMax)
      this.refs.resources.set(r.type, {
        owned: ownedEl,
        price: priceEl,
        demand,
        bar,
        sellOne,
        sellMax,
      })
      section.append(row)
    }
    return section
  }

  private buildCreatures(view: MarketView): HTMLElement {
    const section = el('section', 'market-section')
    const head = el('div', 'market-section-head')
    head.append(el('h3', undefined, 'Creatures'))
    section.append(head)

    if (view.creatures.length === 0) {
      section.append(el('div', 'market-empty', 'You have no creatures to sell.'))
      return section
    }

    for (const c of view.creatures) {
      const row = el('div', 'market-row')
      const info = el('span', 'market-creature')
      info.append(el('span', 'market-name', c.name), el('span', 'market-sub', c.description))
      const priceEl = el('span', 'market-price', `🪙 ${c.value}`)
      this.refs.creatures.set(c.id, priceEl)
      row.append(info, priceEl)

      const confirming = this.pendingSale?.id === c.id
      const sell = el(
        'button',
        confirming ? 'market-btn danger' : 'market-btn',
        confirming ? 'Confirm sale?' : 'Sell'
      )
      sell.addEventListener('click', () => {
        this.audio.onClick?.()
        if (this.pendingSale?.id === c.id) {
          this.cancelPendingSale()
          this.callbacks.onSellCreature(c.id)
          return
        }
        // Selling a creature can't be undone, so ask for a second click.
        this.cancelPendingSale()
        this.pendingSale = {
          id: c.id,
          timer: setTimeout(() => {
            this.pendingSale = null
            if (this.lastView) this.render(this.lastView)
          }, CONFIRM_MS),
        }
        if (this.lastView) this.render(this.lastView)
      })
      row.append(sell)
      section.append(row)
    }
    return section
  }
}
