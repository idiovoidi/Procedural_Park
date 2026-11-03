/**
 * Build HUD
 * Toolbar shown while build mode is on: one slot per tool (with its number key and price)
 * and a status line describing what the current aim would do. Pure view: all text is set
 * with textContent.
 */

export interface BuildHudTool {
  id: string
  /** Key that selects it ("1".."9", "0"). */
  key: string
  label: string
  cost: number | null
}

const STYLE = `
  #build-hud {
    position: fixed; left: 50%; bottom: 150px; transform: translateX(-50%);
    z-index: 900; display: none; flex-direction: column; align-items: center; gap: 8px;
    font-family: system-ui, sans-serif; pointer-events: none;
  }
  #build-hud .bh-status {
    background: rgba(15, 18, 28, 0.88); color: #e8e8e8; padding: 6px 14px;
    border-radius: 8px; font-size: 14px; border: 1px solid rgba(255,255,255,0.15);
  }
  #build-hud .bh-status.bad { color: #ff9a9a; border-color: rgba(255,120,120,0.5); }
  #build-hud .bh-status.good { color: #9af0b0; border-color: rgba(120,255,160,0.4); }
  #build-hud .bh-bar { display: flex; gap: 6px; }
  #build-hud .bh-slot {
    pointer-events: auto; cursor: pointer;
    min-width: 66px; padding: 6px 8px; text-align: center; border-radius: 8px;
    background: rgba(15, 18, 28, 0.85); color: #cfd3e0; font-size: 12px;
    border: 2px solid rgba(255,255,255,0.12);
  }
  #build-hud .bh-slot.active { border-color: #ffd700; color: #fff; background: rgba(60, 50, 10, 0.9); }
  #build-hud .bh-key { display: block; font-weight: bold; color: #ffd700; font-size: 13px; }
  #build-hud .bh-cost { display: block; color: #ffd700; opacity: 0.85; }
  #build-hud .bh-hint { color: #9aa3b8; font-size: 12px; }
`

export class BuildHud {
  private root: HTMLDivElement
  private bar: HTMLDivElement
  private status: HTMLDivElement
  private slots = new Map<string, HTMLDivElement>()
  private lastStatus = ''
  private onSelect: (toolId: string) => void = () => {}

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'build-hud'

    this.status = document.createElement('div')
    this.status.className = 'bh-status'
    this.bar = document.createElement('div')
    this.bar.className = 'bh-bar'
    const hint = document.createElement('div')
    hint.className = 'bh-hint'
    hint.textContent =
      'Click to build · right-click to remove · 1-9/0 or mouse wheel to switch · J to leave'

    this.root.append(this.status, this.bar, hint)
    document.body.appendChild(this.root)

    if (!document.getElementById('build-hud-styles')) {
      const style = document.createElement('style')
      style.id = 'build-hud-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
  }

  /** Called when the player clicks a tool slot. */
  public setOnSelect(callback: (toolId: string) => void): void {
    this.onSelect = callback
  }

  public setTools(tools: BuildHudTool[]): void {
    this.bar.replaceChildren()
    this.slots.clear()
    for (const tool of tools) {
      const slot = document.createElement('div')
      slot.className = 'bh-slot'
      const key = document.createElement('span')
      key.className = 'bh-key'
      key.textContent = tool.key
      const label = document.createElement('span')
      label.textContent = tool.label
      const cost = document.createElement('span')
      cost.className = 'bh-cost'
      cost.textContent = tool.cost === null ? '' : `🪙 ${tool.cost}`
      slot.append(key, label, cost)
      slot.addEventListener('click', () => this.onSelect(tool.id))
      this.bar.append(slot)
      this.slots.set(tool.id, slot)
    }
  }

  public setActive(toolId: string): void {
    for (const [id, slot] of this.slots) slot.classList.toggle('active', id === toolId)
  }

  /** Update the status line; ignores repeats so it can be called every frame. */
  public setStatus(text: string, tone: 'good' | 'bad' | 'neutral'): void {
    const signature = `${tone}|${text}`
    if (signature === this.lastStatus) return
    this.lastStatus = signature
    this.status.textContent = text
    this.status.className = `bh-status ${tone === 'neutral' ? '' : tone}`.trim()
  }

  public show(): void {
    this.root.style.display = 'flex'
  }

  public hide(): void {
    this.root.style.display = 'none'
  }

  public isVisible(): boolean {
    return this.root.style.display !== 'none'
  }
}
