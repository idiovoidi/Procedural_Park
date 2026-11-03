/**
 * Ranch Book
 * The roster (every creature you own, no cap) and the codex (every species you have met).
 * A pure view: it renders the data it is given and reports actions through callbacks. All text
 * goes in via textContent, since creature names can come from imported cards.
 *
 * Like the other panels it rebuilds its DOM only when the structure changes and otherwise
 * patches numbers in place, because care stats move every minute and a rebuild would reset
 * dropdowns and scrolling while the player is using them.
 */

import type { UICallbacks } from '@core/types'

export interface PenOption {
  /** Pen id, or '' for "no pen". */
  value: string
  label: string
  enabled: boolean
}

export interface RosterRow {
  id: string
  name: string
  /** CSS colour taken from the creature's palette. */
  swatch: string
  description: string
  penId: string | null
  /** 0..100 */
  fullness: number
  happiness: number
  trust: number
  lineage: string
  value: number
  penOptions: PenOption[]
}

export interface CodexRow {
  speciesId: number
  name: string
  swatch: string
  found: string
  owned: boolean
  studied: boolean
  best: string
  /** What is known about it (only filled in once studied). */
  details: string[]
  /** What to do next to learn more, when not studied. */
  hint: string
}

export interface RanchBookView {
  creatureCount: number
  speciesCount: number
  ownedSpeciesCount: number
  roster: RosterRow[]
  codex: CodexRow[]
}

export interface RanchBookCallbacks {
  onMove: (creatureId: string, penId: string | null) => void
  onRename: (creatureId: string) => void
  onOpenCards: () => void
}

type Tab = 'roster' | 'codex'

const STYLE = `
  #ranch-book .rb-modal {
    background: rgba(20, 20, 30, 0.98); border-radius: 16px; max-width: 860px; width: 94%;
    max-height: 86vh; overflow: hidden; display: flex; flex-direction: column; color: #e8e8e8;
    border: 2px solid rgba(120, 190, 255, 0.4); box-shadow: 0 8px 32px rgba(0,0,0,0.8);
  }
  #ranch-book .rb-header {
    background: linear-gradient(135deg, #172036 0%, #1c2a48 100%); padding: 12px 20px;
    display: flex; align-items: center; gap: 12px; border-bottom: 2px solid rgba(120,190,255,0.2);
  }
  #ranch-book .rb-header h2 { margin: 0; color: #9fd0ff; font-size: 21px; }
  #ranch-book .rb-tab, #ranch-book .rb-link {
    background: rgba(255,255,255,0.07); color: #cfd8ff; border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px;
  }
  #ranch-book .rb-tab.active { background: #2f5b99; color: #fff; border-color: #7db4ff; }
  #ranch-book .rb-spacer { flex: 1; }
  #ranch-book .rb-summary { color: #9aa; font-size: 12px; padding: 8px 20px 0; }
  #ranch-book .rb-body { padding: 8px 20px 18px; overflow-y: auto; }
  #ranch-book .rb-empty { color: #9aa; font-style: italic; padding: 14px 0; }
  #ranch-book .rb-row {
    display: grid; grid-template-columns: 14px 1fr auto; gap: 4px 12px; align-items: center;
    padding: 8px 10px; background: rgba(255,255,255,0.045); border-radius: 10px; margin-bottom: 7px;
  }
  #ranch-book .rb-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  #ranch-book .rb-name { font-weight: 700; cursor: pointer; }
  #ranch-book .rb-name:hover { text-decoration: underline; }
  #ranch-book .rb-sub { color: #9aa; font-size: 12px; }
  #ranch-book .rb-bars { display: flex; gap: 10px; grid-column: 2; font-size: 11px; color: #9aa; flex-wrap: wrap; }
  #ranch-book .rb-bar { display: inline-flex; align-items: center; gap: 4px; }
  #ranch-book .rb-bar i { display: inline-block; width: 54px; height: 6px; background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden; }
  #ranch-book .rb-bar i b { display: block; height: 100%; }
  #ranch-book .rb-side { grid-row: 1 / span 2; grid-column: 3; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
  #ranch-book .rb-price { color: #ffd700; font-size: 12px; }
  #ranch-book select { background: #1b2236; color: #e8e8e8; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 4px 6px; font-size: 12px; max-width: 190px; }
  #ranch-book .rb-card { grid-template-columns: 14px 1fr; }
  #ranch-book .rb-detail { grid-column: 2; font-size: 12px; color: #d6dbe8; }
  #ranch-book .rb-tag { font-size: 11px; padding: 1px 7px; border-radius: 8px; background: rgba(255,255,255,0.1); margin-left: 6px; }
  #ranch-book .rb-tag.owned { background: #2d6b4a; }
  #ranch-book .rb-hint { grid-column: 2; font-size: 12px; color: #e0b46a; }
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

const barColor = (v: number): string => (v >= 60 ? '#6fd36f' : v >= 30 ? '#e0b341' : '#e0603a')

export class RanchBook {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private summary: HTMLDivElement
  private tabButtons = new Map<Tab, HTMLButtonElement>()
  private open_ = false
  private tab: Tab = 'roster'
  private audio: UICallbacks = {}
  private callbacks: RanchBookCallbacks = {
    onMove: () => {},
    onRename: () => {},
    onOpenCards: () => {},
  }
  private lastView: RanchBookView | null = null
  private signature = ''
  private barRefs = new Map<
    string,
    { fullness: HTMLElement; happiness: HTMLElement; trust: HTMLElement; price: HTMLElement }
  >()

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'ranch-book'
    this.container.style.display = 'none'

    const modal = el('div', 'rb-modal')
    const header = el('div', 'rb-header')
    header.append(el('h2', undefined, '📖 Ranch Book'))
    for (const [tab, label] of [
      ['roster', 'Roster'],
      ['codex', 'Codex'],
    ] as const) {
      const button = el('button', 'rb-tab', label)
      button.addEventListener('click', () => {
        this.audio.onClick?.()
        this.tab = tab
        this.signature = ''
        if (this.lastView) this.render(this.lastView)
      })
      this.tabButtons.set(tab, button)
      header.append(button)
    }
    header.append(el('span', 'rb-spacer'))
    const cards = el('button', 'rb-link', '🖼 Saved cards')
    cards.addEventListener('click', () => {
      this.audio.onClick?.()
      this.callbacks.onOpenCards()
    })
    const close = el('button', 'close-btn', '✕')
    close.addEventListener('click', () => {
      this.audio.onClick?.()
      this.close()
    })
    header.append(cards, close)

    this.summary = el('div', 'rb-summary')
    this.body = el('div', 'rb-body')
    modal.append(header, this.summary, this.body)
    this.container.append(modal)
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close()
    })

    if (!document.getElementById('ranch-book-styles')) {
      const style = document.createElement('style')
      style.id = 'ranch-book-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: RanchBookCallbacks): void {
    this.callbacks = callbacks
  }

  public isOpen(): boolean {
    return this.open_
  }

  public open(): void {
    this.open_ = true
    this.container.style.display = 'flex'
    this.signature = ''
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

  public getTab(): 'roster' | 'codex' {
    return this.tab
  }

  public render(view: RanchBookView): void {
    this.lastView = view
    if (!this.open_) return

    for (const [tab, button] of this.tabButtons) button.classList.toggle('active', tab === this.tab)
    this.summary.textContent = `${view.creatureCount} creature${view.creatureCount === 1 ? '' : 's'} · ${view.speciesCount} species in the codex (${view.ownedSpeciesCount} owned)`

    const signature =
      this.tab === 'roster'
        ? `r|${JSON.stringify(view.roster.map((r) => [r.id, r.name, r.description, r.penId, r.lineage, r.penOptions]))}`
        : `c|${JSON.stringify(view.codex)}`
    if (signature !== this.signature || this.body.childElementCount === 0) {
      this.signature = signature
      this.rebuild(view)
    }
    this.patch(view)
  }

  private patch(view: RanchBookView): void {
    if (this.tab !== 'roster') return
    for (const row of view.roster) {
      const ref = this.barRefs.get(row.id)
      if (!ref) continue
      for (const key of ['fullness', 'happiness', 'trust'] as const) {
        const fill = ref[key].firstElementChild as HTMLElement | null
        if (fill) {
          fill.style.width = `${Math.round(row[key])}%`
          fill.style.background = barColor(row[key])
        }
      }
      ref.price.textContent = `🪙 ${row.value}`
    }
  }

  private rebuild(view: RanchBookView): void {
    this.barRefs.clear()
    if (this.tab === 'roster') {
      if (view.roster.length === 0) {
        this.body.replaceChildren(
          el(
            'div',
            'rb-empty',
            'You do not own any creatures yet. Feed a wild creature (F) until it trusts you, then crate it (Y).'
          )
        )
        return
      }
      this.body.replaceChildren(...view.roster.map((row) => this.rosterRow(row)))
    } else {
      if (view.codex.length === 0) {
        this.body.replaceChildren(
          el(
            'div',
            'rb-empty',
            'The codex is empty. Photograph a creature (T), or capture or breed one, to add its species.'
          )
        )
        return
      }
      this.body.replaceChildren(...view.codex.map((row) => this.codexRow(row)))
    }
  }

  private dot(color: string): HTMLElement {
    const dot = el('span', 'rb-dot')
    dot.style.background = color
    return dot
  }

  private rosterRow(row: RosterRow): HTMLElement {
    const node = el('div', 'rb-row')
    node.append(this.dot(row.swatch))

    const info = el('div')
    const name = el('div', 'rb-name', row.name)
    name.title = 'Click to rename'
    name.addEventListener('click', () => this.callbacks.onRename(row.id))
    info.append(name, el('div', 'rb-sub', `${row.description} · ${row.lineage}`))
    node.append(info)

    const side = el('div', 'rb-side')
    const select = el('select')
    for (const o of row.penOptions) {
      const option = el('option', undefined, o.label)
      option.value = o.value
      option.disabled = !o.enabled
      select.append(option)
    }
    select.value = row.penId ?? ''
    select.addEventListener('change', () => {
      this.audio.onClick?.()
      this.callbacks.onMove(row.id, select.value || null)
    })
    const price = el('span', 'rb-price', `🪙 ${row.value}`)
    side.append(select, price)
    node.append(side)

    const bars = el('div', 'rb-bars')
    const refs = {} as {
      fullness: HTMLElement
      happiness: HTMLElement
      trust: HTMLElement
      price: HTMLElement
    }
    for (const [key, label] of [
      ['fullness', 'Fed'],
      ['happiness', 'Mood'],
      ['trust', 'Trust'],
    ] as const) {
      const wrap = el('span', 'rb-bar')
      const track = el('i')
      track.append(el('b'))
      wrap.append(document.createTextNode(label), track)
      bars.append(wrap)
      refs[key] = track
    }
    refs.price = price
    this.barRefs.set(row.id, refs)
    node.append(bars)
    return node
  }

  private codexRow(row: CodexRow): HTMLElement {
    const node = el('div', 'rb-row rb-card')
    node.append(this.dot(row.swatch))

    const info = el('div')
    const title = el('div', 'rb-name', row.name)
    title.style.cursor = 'default'
    if (row.owned) title.append(el('span', 'rb-tag owned', 'owned'))
    title.append(el('span', 'rb-tag', row.found))
    info.append(title, el('div', 'rb-sub', `Best: ${row.best}`))
    node.append(info)

    if (row.studied) {
      for (const line of row.details) node.append(el('div', 'rb-detail', line))
    } else {
      node.append(el('div', 'rb-hint', row.hint))
    }
    return node
  }
}
