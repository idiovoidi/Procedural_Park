/**
 * Arena panel
 * Modal for the optional auto-battler: pick up to three adults, fight the ladder for coins, and
 * duel a friend. Pure view: it renders what it is given and reports clicks.
 */

import type { UICallbacks } from '@core/types'

export interface ArenaFighterRow {
  id: string
  name: string
  description: string
  selected: boolean
  /** Combat summary, e.g. "HP 80 · hits 2 · gore". */
  combat: string
  disabled: boolean
}

export interface ArenaRungRow {
  rung: number
  state: 'open' | 'beaten' | 'locked'
  reward: string
}

export interface ArenaPanelView {
  fighters: ArenaFighterRow[]
  selectedCount: number
  teamSize: number
  ladder: ArenaRungRow[]
  /** The last fight, as lines to show (empty if none yet). */
  report: { title: string; lines: string[]; won: boolean | null } | null
  duel: {
    connected: boolean
    waiting: boolean
    incoming: string | null
  }
}

export interface ArenaPanelCallbacks {
  onToggle: (creatureId: string) => void
  onFight: (rung: number) => void
  onChallenge: () => void
  onCancelDuel: () => void
  onAcceptDuel: () => void
  onDeclineDuel: () => void
}

const STYLE = `
  #arena-panel .ap-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  #arena-panel .ap-row.selected { background: rgba(255,215,0,0.08); }
  #arena-panel .ap-name { font-weight: bold; }
  #arena-panel .ap-sub, #arena-panel .ap-none { color: #9aa3b8; font-size: 12px; }
  #arena-panel .ap-report { white-space: pre-wrap; font: 12px ui-monospace, monospace; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; }
  #arena-panel .ap-win { color: #9af0b0; } #arena-panel .ap-loss { color: #ff9a9a; }
  #arena-panel h3 { margin: 14px 0 4px; }
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

export class ArenaPanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: ArenaPanelCallbacks = {
    onToggle: () => {},
    onFight: () => {},
    onChallenge: () => {},
    onCancelDuel: () => {},
    onAcceptDuel: () => {},
    onDeclineDuel: () => {},
  }
  private lastView: ArenaPanelView | null = null
  private signature = ''

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'arena-panel'
    this.container.style.display = 'none'
    const modal = el('div', 'market-modal')
    const header = el('div', 'market-header')
    header.append(el('h2', undefined, '⚔️ Arena'))
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
    if (!document.getElementById('arena-panel-styles')) {
      const style = document.createElement('style')
      style.id = 'arena-panel-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: ArenaPanelCallbacks): void {
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

  public render(view: ArenaPanelView): void {
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
    const row = (cls: string, name: string, sub: string, ...actions: HTMLElement[]) => {
      const r = el('div', cls)
      const left = el('div')
      left.append(el('div', 'ap-name', name), el('div', 'ap-sub', sub))
      const right = el('div')
      right.append(...actions)
      r.append(left, right)
      return r
    }

    const nodes: HTMLElement[] = [
      el(
        'p',
        'ap-none',
        'Optional: no creature is ever lost. Pick adults, then fight. Stats come from the same traits that matter for the ranch.'
      ),
      el('h3', undefined, `Your team (${view.selectedCount}/${view.teamSize})`),
    ]
    if (view.fighters.length === 0)
      nodes.push(el('p', 'ap-none', 'You have no adult creatures yet.'))
    for (const f of view.fighters) {
      nodes.push(
        row(
          f.selected ? 'ap-row selected' : 'ap-row',
          f.name,
          `${f.description} · ${f.combat}`,
          button(
            f.selected ? 'Remove' : 'Pick',
            () => this.callbacks.onToggle(f.id),
            f.disabled && !f.selected
          )
        )
      )
    }

    nodes.push(el('h3', undefined, 'Ladder'))
    for (const r of view.ladder) {
      const label = r.state === 'beaten' ? 'Fight again' : r.state === 'open' ? 'Fight' : 'Locked'
      nodes.push(
        row(
          'ap-row',
          `Rung ${r.rung}${r.state === 'beaten' ? ' ✓' : ''}`,
          r.reward,
          button(
            label,
            () => this.callbacks.onFight(r.rung),
            r.state === 'locked' || view.selectedCount === 0
          )
        )
      )
    }

    if (view.report) {
      nodes.push(el('h3', undefined, view.report.title))
      const pre = el('div', 'ap-report')
      pre.textContent = view.report.lines.join('\n')
      pre.classList.add(
        view.report.won === true ? 'ap-win' : view.report.won === false ? 'ap-loss' : 'ap-none'
      )
      nodes.push(pre)
    }

    nodes.push(el('h3', undefined, 'Duel a friend'))
    if (!view.duel.connected) {
      nodes.push(
        el(
          'p',
          'ap-none',
          'Connect to a friend first (🌐). Both of you run the same seeded fight, so you see the same result.'
        )
      )
    }
    if (view.duel.incoming) {
      nodes.push(
        row(
          'ap-row',
          'Your friend challenges you',
          `Their team: ${view.duel.incoming}. Answer with the team you picked.`,
          button('Accept', () => this.callbacks.onAcceptDuel(), view.selectedCount === 0),
          button('Decline', () => this.callbacks.onDeclineDuel())
        )
      )
    }
    nodes.push(
      row(
        'ap-row',
        view.duel.waiting ? 'Waiting for your friend…' : 'Challenge with your team',
        'No coins change hands: bragging rights only.',
        view.duel.waiting
          ? button('Cancel', () => this.callbacks.onCancelDuel())
          : button(
              'Challenge',
              () => this.callbacks.onChallenge(),
              !view.duel.connected || view.selectedCount === 0
            )
      )
    )
    this.body.replaceChildren(...nodes)
  }
}
