/**
 * Contract Board panel
 * Modal listing the open contracts: what the buyer wants, what it pays, how long it stays, and a
 * button per owned creature that fits. Pure view: it renders what it is given and reports clicks.
 * Rows are rebuilt only when the contracts or matching creatures change; the countdowns are
 * patched in place so clicks are never swallowed by a redraw.
 */

import type { UICallbacks } from '@core/types'

export interface ContractCandidateView {
  id: string
  name: string
  description: string
}

export interface ContractRowView {
  id: string
  /** The requirements in plain words. */
  title: string
  reward: number
  secondsLeft: number
  candidates: ContractCandidateView[]
}

export interface ContractBoardView {
  contracts: ContractRowView[]
}

export interface ContractBoardCallbacks {
  onDeliver: (contractId: string, creatureId: string) => void
}

const STYLE = `
  #contract-board .cb-row { border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 12px; margin: 8px 0; }
  #contract-board .cb-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  #contract-board .cb-title { font-weight: bold; text-transform: capitalize; }
  #contract-board .cb-reward { color: #ffd700; font-weight: bold; white-space: nowrap; }
  #contract-board .cb-time { color: #9aa3b8; font-size: 12px; }
  #contract-board .cb-actions { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
  #contract-board .cb-none { color: #9aa3b8; font-size: 12px; }
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min left` : `${m} min left`
}

export class ContractBoardPanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: ContractBoardCallbacks = { onDeliver: () => {} }
  private lastView: ContractBoardView | null = null
  private signature = ''
  private times = new Map<string, HTMLElement>()

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'contract-board'
    this.container.style.display = 'none'

    const modal = el('div', 'market-modal')
    const header = el('div', 'market-header')
    header.append(el('h2', undefined, '📜 Contract Board'))
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

    if (!document.getElementById('contract-board-styles')) {
      const style = document.createElement('style')
      style.id = 'contract-board-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: ContractBoardCallbacks): void {
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

  public render(view: ContractBoardView): void {
    this.lastView = view
    if (!this.open_) return

    const signature = view.contracts
      .map(
        (c) =>
          `${c.id}:${c.reward}:${c.title}:${c.candidates.map((x) => `${x.id}/${x.name}`).join(',')}`
      )
      .join('|')

    if (signature !== this.signature) {
      this.signature = signature
      this.rebuild(view)
    }
    for (const c of view.contracts) {
      const t = this.times.get(c.id)
      if (t) t.textContent = formatTime(c.secondsLeft)
    }
  }

  private rebuild(view: ContractBoardView): void {
    this.times.clear()
    const nodes: HTMLElement[] = [
      el(
        'p',
        'cb-none',
        'Buyers pay far more than the market for the right creature. Breed toward a request, then deliver an adult.'
      ),
    ]
    if (view.contracts.length === 0) nodes.push(el('p', 'cb-none', 'No contracts posted yet.'))

    for (const c of view.contracts) {
      const row = el('div', 'cb-row')
      row.dataset.contract = c.id
      const top = el('div', 'cb-top')
      top.append(el('span', 'cb-title', c.title), el('span', 'cb-reward', `🪙 ${c.reward}`))
      const time = el('div', 'cb-time', formatTime(c.secondsLeft))
      this.times.set(c.id, time)
      const actions = el('div', 'cb-actions')
      if (c.candidates.length === 0) {
        actions.append(el('span', 'cb-none', 'No creature of yours fits yet.'))
      }
      for (const cand of c.candidates.slice(0, 4)) {
        const button = el('button', 'market-btn', `Deliver ${cand.name}`)
        button.title = cand.description
        button.addEventListener('click', () => {
          this.audio.onClick?.()
          this.callbacks.onDeliver(c.id, cand.id)
        })
        actions.append(button)
      }
      row.append(top, time, actions)
      nodes.push(row)
    }
    this.body.replaceChildren(...nodes)
  }
}
