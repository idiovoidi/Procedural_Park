/**
 * Tool belt
 * A bar along the bottom with one clickable slot per field action (feed, lure, crate, photo,
 * build, breed, market, ranch book), each showing its key, so everything is reachable with a
 * mouse, a gamepad cursor or a thumb. Also holds the pen inspector: a small card describing the
 * pen the player is looking into. Pure view: all text is set with textContent.
 */

export interface ToolBeltSlot {
  id: string
  icon: string
  label: string
  /** Key shown on the slot ("F", "J", ...). */
  key: string
}

export interface PenInspectorRow {
  name: string
  /** 0..100 bars. */
  fullness: number
  happiness: number
  /** Share (0..1) of what it needs from the pen. */
  quality: number
}

export interface PenInspectorView {
  title: string
  summary: string
  /** Worst-met needs of the pen, as short sentences. */
  problems: string[]
  rows: PenInspectorRow[]
}

const STYLE = `
  #tool-belt {
    position: fixed; left: 50%; bottom: 56px; transform: translateX(-50%);
    z-index: 850; display: flex; gap: 6px; font-family: system-ui, sans-serif;
    max-width: 96vw; overflow-x: auto;
  }
  #tool-belt .tb-slot {
    cursor: pointer; min-width: 52px; padding: 5px 6px; text-align: center; border-radius: 8px;
    background: rgba(15, 18, 28, 0.85); color: #cfd3e0; font-size: 11px;
    border: 2px solid rgba(255,255,255,0.12); user-select: none; touch-action: manipulation;
  }
  #tool-belt .tb-slot:hover { border-color: rgba(255,255,255,0.4); }
  #tool-belt .tb-slot.active { border-color: #ffd700; color: #fff; background: rgba(60,50,10,0.9); }
  #tool-belt .tb-icon { display: block; font-size: 20px; line-height: 1.2; }
  #tool-belt .tb-key { display: block; font-weight: bold; color: #ffd700; }
  #pen-inspector {
    position: fixed; left: 14px; top: 50%; transform: translateY(-50%); z-index: 850;
    display: none; width: 230px; padding: 10px 12px; border-radius: 8px;
    background: rgba(15, 18, 28, 0.88); color: #e8e8e8; font: 12px system-ui, sans-serif;
    border: 1px solid rgba(255,255,255,0.15); pointer-events: none;
  }
  #pen-inspector .pi-title { font-weight: bold; font-size: 14px; color: #ffd700; }
  #pen-inspector .pi-summary { color: #9aa3b8; margin-bottom: 4px; }
  #pen-inspector .pi-problem { color: #ffb36b; }
  #pen-inspector .pi-row { margin-top: 5px; }
  #pen-inspector .pi-bars { display: flex; gap: 3px; margin-top: 2px; }
  #pen-inspector .pi-bar { flex: 1; height: 5px; background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden; }
  #pen-inspector .pi-bar > i { display: block; height: 100%; }
`

export class ToolBelt {
  private belt: HTMLDivElement
  private inspector: HTMLDivElement
  private slots = new Map<string, HTMLDivElement>()
  private onUse: (id: string) => void = () => {}
  private lastInspector = ''

  constructor() {
    this.belt = document.createElement('div')
    this.belt.id = 'tool-belt'
    this.inspector = document.createElement('div')
    this.inspector.id = 'pen-inspector'
    document.body.append(this.belt, this.inspector)

    if (!document.getElementById('tool-belt-styles')) {
      const style = document.createElement('style')
      style.id = 'tool-belt-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
  }

  public setOnUse(callback: (id: string) => void): void {
    this.onUse = callback
  }

  public setSlots(slots: ToolBeltSlot[]): void {
    this.belt.replaceChildren()
    this.slots.clear()
    for (const slot of slots) {
      const el = document.createElement('div')
      el.className = 'tb-slot'
      el.dataset.tool = slot.id
      el.title = slot.key ? `${slot.label} (${slot.key})` : slot.label
      const icon = document.createElement('span')
      icon.className = 'tb-icon'
      icon.textContent = slot.icon
      const label = document.createElement('span')
      label.textContent = slot.label
      const key = document.createElement('span')
      key.className = 'tb-key'
      key.textContent = slot.key
      el.append(icon, label)
      if (slot.key) el.append(key)
      el.addEventListener('click', () => this.onUse(slot.id))
      this.belt.append(el)
      this.slots.set(slot.id, el)
    }
  }

  public setActive(ids: ReadonlySet<string>): void {
    for (const [id, el] of this.slots) el.classList.toggle('active', ids.has(id))
  }

  public setVisible(visible: boolean): void {
    this.belt.style.display = visible ? 'flex' : 'none'
    if (!visible) this.inspector.style.display = 'none'
  }

  /** Show a description of the pen being looked into, or hide the card with null. */
  public setPen(view: PenInspectorView | null): void {
    const signature = view ? JSON.stringify(view) : ''
    if (signature === this.lastInspector) return
    this.lastInspector = signature
    if (!view) {
      this.inspector.style.display = 'none'
      return
    }
    const title = document.createElement('div')
    title.className = 'pi-title'
    title.textContent = view.title
    const summary = document.createElement('div')
    summary.className = 'pi-summary'
    summary.textContent = view.summary
    this.inspector.replaceChildren(title, summary)
    for (const p of view.problems) {
      const el = document.createElement('div')
      el.className = 'pi-problem'
      el.textContent = `⚠ ${p}`
      this.inspector.append(el)
    }
    for (const row of view.rows) {
      const el = document.createElement('div')
      el.className = 'pi-row'
      const name = document.createElement('div')
      name.textContent = `${row.name} · fits ${Math.round(row.quality * 100)}%`
      const bars = document.createElement('div')
      bars.className = 'pi-bars'
      bars.append(bar(row.fullness, '#e0a050'), bar(row.happiness, '#7ad07a'))
      el.append(name, bars)
      this.inspector.append(el)
    }
    this.inspector.style.display = 'block'
  }
}

function bar(value: number, color: string): HTMLDivElement {
  const outer = document.createElement('div')
  outer.className = 'pi-bar'
  const fill = document.createElement('i')
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`
  fill.style.background = color
  outer.append(fill)
  return outer
}
