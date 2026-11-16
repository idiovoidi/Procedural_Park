/**
 * Breeding Panel
 * Modal for the breeding den: choose a den pen and two parents, see why a pair is refused or
 * what it can produce, start a breeding, and watch eggs hatch. A pure view: it renders the
 * data it is given and reports choices through callbacks. All text goes in via textContent.
 *
 * Like the market panel, it only rebuilds its DOM when its structure changes, and otherwise
 * patches numbers in place, because progress bars update every second and a rebuild would
 * swallow clicks.
 */

import type { UICallbacks } from '@core/types'

export interface BreedingDenOption {
  penId: string
  label: string
}

export interface BreedingCandidate {
  id: string
  label: string
}

export interface BreedingSample {
  name: string
  detail: string
}

export interface BreedingJobRow {
  id: number
  label: string
  /** 0..1 */
  progress: number
  secondsLeft: number
}

export interface BreedingView {
  balance: number
  dens: BreedingDenOption[]
  penId: string | null
  candidates: BreedingCandidate[]
  parentA: string | null
  parentB: string | null
  /** Why the chosen pair can't breed (empty when they can). */
  problems: string[]
  cost: number | null
  /** Human-readable odds lines for the chosen pair. */
  odds: string[]
  samples: BreedingSample[]
  canBreed: boolean
  jobs: BreedingJobRow[]
}

export interface BreedingPanelCallbacks {
  onSelectPen: (penId: string) => void
  onSelectParent: (slot: 'a' | 'b', creatureId: string | null) => void
  onBreed: () => void
}

const STYLE = `
  #breeding-panel .breed-modal {
    background: rgba(20, 20, 30, 0.98); border-radius: 16px; max-width: 720px; width: 92%;
    max-height: 84vh; overflow: hidden; display: flex; flex-direction: column; color: #e8e8e8;
    border: 2px solid rgba(215, 127, 176, 0.45); box-shadow: 0 8px 32px rgba(0,0,0,0.8);
  }
  #breeding-panel .breed-header {
    background: linear-gradient(135deg, #2a1a2e 0%, #1c2140 100%); padding: 14px 22px;
    display: flex; align-items: center; gap: 16px; border-bottom: 2px solid rgba(215,127,176,0.25);
  }
  #breeding-panel .breed-header h2 { margin: 0; color: #f2a6d2; font-size: 22px; }
  #breeding-panel .breed-balance { margin-left: auto; color: #ffd700; font-weight: bold; }
  #breeding-panel .breed-body { padding: 14px 22px 20px; overflow-y: auto; }
  #breeding-panel h3 { margin: 14px 0 6px; color: #cfd8ff; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; }
  #breeding-panel .breed-row { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
  #breeding-panel label { color: #9aa; min-width: 70px; font-size: 13px; }
  #breeding-panel select {
    flex: 1; min-width: 200px; background: #1b2236; color: #e8e8e8; padding: 6px 8px;
    border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-size: 13px;
  }
  #breeding-panel .breed-problems { color: #ff9a9a; margin: 6px 0; font-size: 13px; }
  #breeding-panel .breed-problems div::before { content: '⚠ '; }
  #breeding-panel .breed-odds div { font-size: 13px; padding: 2px 0; color: #d6dbe8; }
  #breeding-panel .breed-samples { display: flex; gap: 8px; flex-wrap: wrap; }
  #breeding-panel .breed-sample {
    background: rgba(255,255,255,0.05); border-radius: 8px; padding: 6px 10px; min-width: 150px; font-size: 12px;
  }
  #breeding-panel .breed-sample b { display: block; color: #f2a6d2; font-size: 13px; }
  #breeding-panel .breed-btn {
    background: #8a3f74; color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 8px;
    padding: 8px 16px; cursor: pointer; font-size: 14px; font-weight: 600;
  }
  #breeding-panel .breed-btn:hover:not(:disabled) { background: #a84d8c; }
  #breeding-panel .breed-btn:disabled { opacity: 0.4; cursor: default; }
  #breeding-panel .breed-job { display: flex; align-items: center; gap: 10px; padding: 6px 8px; background: rgba(255,255,255,0.04); border-radius: 8px; margin-bottom: 6px; font-size: 13px; }
  #breeding-panel .breed-job .bar { flex: 1; height: 8px; background: rgba(255,255,255,0.12); border-radius: 4px; overflow: hidden; }
  #breeding-panel .breed-job .fill { display: block; height: 100%; background: linear-gradient(90deg, #d77fb0, #ffd36a); }
  #breeding-panel .breed-empty { color: #9aa; font-style: italic; padding: 8px 0; }
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

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds))
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

export class BreedingPanel {
  private container: HTMLDivElement
  private body: HTMLDivElement
  private balanceEl: HTMLSpanElement
  private open_ = false
  private audio: UICallbacks = {}
  private callbacks: BreedingPanelCallbacks = {
    onSelectPen: () => {},
    onSelectParent: () => {},
    onBreed: () => {},
  }
  private lastView: BreedingView | null = null
  private signature = ''
  private jobRefs = new Map<number, { fill: HTMLElement; time: HTMLElement }>()
  private breedBtn: HTMLButtonElement | null = null
  private costEl: HTMLElement | null = null

  constructor() {
    this.container = el('div', 'modal-overlay')
    this.container.id = 'breeding-panel'
    this.container.style.display = 'none'

    const modal = el('div', 'breed-modal')
    const header = el('div', 'breed-header')
    header.append(el('h2', undefined, '🥚 Breeding Den'))
    this.balanceEl = el('span', 'breed-balance', '🪙 0')
    header.append(this.balanceEl)
    const close = el('button', 'close-btn', '✕')
    close.addEventListener('click', () => {
      this.audio.onClick?.()
      this.close()
    })
    header.append(close)

    this.body = el('div', 'breed-body')
    modal.append(header, this.body)
    this.container.append(modal)
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close()
    })

    if (!document.getElementById('breeding-panel-styles')) {
      const style = document.createElement('style')
      style.id = 'breeding-panel-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    document.body.appendChild(this.container)
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audio = callbacks
  }

  public setCallbacks(callbacks: BreedingPanelCallbacks): void {
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

  /** Keep the balance current while the panel is closed, without needing a full view. */
  public setBalance(balance: number): void {
    this.balanceEl.textContent = `🪙 ${balance}`
  }

  public render(view: BreedingView): void {
    this.lastView = view
    this.balanceEl.textContent = `🪙 ${view.balance}`
    if (!this.open_) return

    const signature = JSON.stringify([
      view.dens,
      view.penId,
      view.candidates,
      view.parentA,
      view.parentB,
      view.problems,
      view.odds,
      view.samples,
      view.canBreed,
      view.jobs.map((j) => [j.id, j.label]),
    ])
    if (signature !== this.signature || this.body.childElementCount === 0) {
      this.signature = signature
      this.rebuild(view)
    }
    this.patch(view)
  }

  /** Update the numbers that change every second without touching the structure. */
  private patch(view: BreedingView): void {
    for (const job of view.jobs) {
      const ref = this.jobRefs.get(job.id)
      if (!ref) continue
      ref.fill.style.width = `${Math.round(job.progress * 100)}%`
      ref.time.textContent = formatTime(job.secondsLeft)
    }
    if (this.costEl) this.costEl.textContent = view.cost === null ? '' : `Cost: 🪙 ${view.cost}`
    if (this.breedBtn) this.breedBtn.disabled = !view.canBreed
  }

  private rebuild(view: BreedingView): void {
    this.jobRefs.clear()
    this.breedBtn = null
    this.costEl = null

    const nodes: HTMLElement[] = []

    if (view.dens.length === 0) {
      nodes.push(
        el(
          'div',
          'breed-empty',
          'You have no breeding den yet. Build one (press J, pick "Breeding den") inside a closed pen, then house two adult creatures there.'
        )
      )
    } else {
      nodes.push(el('h3', undefined, 'Parents'))

      const penRow = el('div', 'breed-row')
      penRow.append(el('label', undefined, 'Den'))
      penRow.append(
        this.select(
          view.dens.map((d) => ({ value: d.penId, label: d.label })),
          view.penId,
          (value) => value && this.callbacks.onSelectPen(value)
        )
      )
      nodes.push(penRow)

      for (const slot of ['a', 'b'] as const) {
        const row = el('div', 'breed-row')
        row.append(el('label', undefined, slot === 'a' ? 'Parent 1' : 'Parent 2'))
        row.append(
          this.select(
            [
              { value: '', label: '— choose —' },
              ...view.candidates.map((c) => ({ value: c.id, label: c.label })),
            ],
            slot === 'a' ? view.parentA : view.parentB,
            (value) => this.callbacks.onSelectParent(slot, value || null)
          )
        )
        nodes.push(row)
      }

      if (view.problems.length > 0) {
        const problems = el('div', 'breed-problems')
        for (const p of view.problems) problems.append(el('div', undefined, p))
        nodes.push(problems)
      }

      if (view.odds.length > 0) {
        nodes.push(el('h3', undefined, 'What this pair can produce'))
        const odds = el('div', 'breed-odds')
        for (const line of view.odds) odds.append(el('div', undefined, line))
        nodes.push(odds)

        if (view.samples.length > 0) {
          nodes.push(el('h3', undefined, 'Examples (not the actual result)'))
          const samples = el('div', 'breed-samples')
          for (const s of view.samples) {
            const card = el('div', 'breed-sample')
            card.append(el('b', undefined, s.name), el('span', undefined, s.detail))
            samples.append(card)
          }
          nodes.push(samples)
        }
      }

      const actions = el('div', 'breed-row')
      actions.style.marginTop = '14px'
      const btn = el('button', 'breed-btn', '🥚 Start breeding')
      btn.addEventListener('click', () => {
        this.audio.onClick?.()
        this.callbacks.onBreed()
      })
      this.breedBtn = btn
      this.costEl = el('span', undefined, '')
      this.costEl.style.color = '#ffd700'
      actions.append(btn, this.costEl)
      nodes.push(actions)
    }

    nodes.push(el('h3', undefined, 'Eggs'))
    if (view.jobs.length === 0) {
      nodes.push(el('div', 'breed-empty', 'No eggs right now.'))
    } else {
      for (const job of view.jobs) {
        const row = el('div', 'breed-job')
        const bar = el('span', 'bar')
        const fill = el('span', 'fill')
        bar.append(fill)
        const time = el('span', undefined, '')
        row.append(el('span', undefined, `🥚 ${job.label}`), bar, time)
        this.jobRefs.set(job.id, { fill, time })
        nodes.push(row)
      }
    }

    this.body.replaceChildren(...nodes)
  }

  private select(
    options: Array<{ value: string; label: string }>,
    selected: string | null,
    onChange: (value: string) => void
  ): HTMLSelectElement {
    const select = el('select')
    for (const o of options) {
      const option = el('option', undefined, o.label)
      option.value = o.value
      select.append(option)
    }
    select.value = selected ?? ''
    select.addEventListener('change', () => {
      this.audio.onClick?.()
      onChange(select.value)
    })
    return select
  }
}
