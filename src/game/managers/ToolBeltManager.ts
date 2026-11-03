import { getCreatureEconomyProfile } from '@systems/economy'
import { scorePen } from '@systems/park'
import type { PenInspectorView, ToolBeltSlot } from '@ui/components/tool-belt'
import type { GameSystems } from '../SystemsCoordinator'

/** The actions the belt can trigger: the same ones the keyboard bindings reach. */
export interface ToolBeltActions {
  feed: () => void
  lure: () => void
  crate: () => void
  collect: () => void
  stock: () => void
  shop: () => void
  photo: () => void
  build: () => void
  breed: () => void
  market: () => void
  book: () => void
  board: () => void
}

const SLOTS: ToolBeltSlot[] = [
  { id: 'feed', icon: '🍖', label: 'Feed', key: 'F' },
  { id: 'lure', icon: '🪤', label: 'Bait', key: 'L' },
  { id: 'crate', icon: '📦', label: 'Crate', key: 'Y' },
  { id: 'shop', icon: '🛒', label: 'Shop', key: 'O' },
  { id: 'stock', icon: '🥣', label: 'Stock', key: '' },
  { id: 'collect', icon: '🧺', label: 'Collect', key: 'Q' },
  { id: 'photo', icon: '📷', label: 'Photo', key: 'T' },
  { id: 'build', icon: '🔨', label: 'Build', key: 'J' },
  { id: 'breed', icon: '🥚', label: 'Breed', key: 'Z' },
  { id: 'market', icon: '💰', label: 'Market', key: 'U' },
  { id: 'book', icon: '📖', label: 'Book', key: 'K' },
  { id: 'board', icon: '📜', label: 'Board', key: '' },
]

/** How far ahead of the camera to look for a pen (metres), and how often to refresh (ms). */
const LOOK_AHEAD_M = [2, 5, 8]
const REFRESH_MS = 250

/** Foods a resident digests at least this well count as "theirs" when stocking a pen. */
const STOCK_MIN_EFFICIENCY = 0.5

/** Warn once a bin is this full (0..1). */
const BIN_FULL_WARNING = 0.8

const REQUIREMENT_LABEL: Record<string, string> = {
  space: 'space',
  water: 'water',
  enclosure: 'enclosure',
  enrichment: 'enrichment',
  biome: 'ground',
  company: 'company',
}

/**
 * ToolBeltManager
 * Gives every field action a clickable slot, lights up the mode that is on, and shows the pen
 * the player is looking into (its residents' needs and what the pen is missing).
 */
export class ToolBeltManager {
  private readonly systems: GameSystems
  private readonly actions: ToolBeltActions
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(systems: GameSystems, actions: ToolBeltActions) {
    this.systems = systems
    this.actions = actions
  }

  public initialize(): void {
    const belt = this.systems.ui.getToolBelt()
    belt.setSlots(SLOTS)
    belt.setOnUse((id) => this.actions[id as keyof ToolBeltActions]?.())
    this.refresh()
    this.timer = setInterval(() => this.refresh(), REFRESH_MS)
  }

  public dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  public refresh(): void {
    const { ui, build } = this.systems
    const belt = ui.getToolBelt()
    const active = new Set<string>()
    if (build.isActive()) active.add('build')
    if (ui.getMarketPanel().isOpen()) active.add('market')
    if (ui.getBreedingPanel().isOpen()) active.add('breed')
    if (ui.getRanchBook().isOpen()) active.add('book')
    if (ui.getContractBoard().isOpen()) active.add('board')
    belt.setActive(active)
    belt.setPen(this.inspect())
  }

  /**
   * Empty the collector bins of the pen being looked into (every pen if none is) into the
   * inventory, so the output can be sold.
   */
  public collect(): void {
    const { production, park, ui } = this.systems
    const looked = this.lookedAtPen()
    const pens = looked ? [looked] : park.getPens()
    const total: Record<string, number> = {}
    for (const pen of pens) {
      for (const [type, units] of Object.entries(production.collect(pen.id))) {
        total[type] = (total[type] ?? 0) + (units ?? 0)
      }
    }
    const parts = Object.entries(total)
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `${n} ${type}`)
    ui.showToast(
      parts.length > 0
        ? `🧺 Collected ${parts.join(', ')}`
        : looked
          ? '🧺 Nothing to collect here yet'
          : '🧺 Nothing to collect yet'
    )
    this.refresh()
  }

  /**
   * Put food from the player's bag into the pen being looked into: troughs first, then the
   * feeder hoppers. Only foods its residents eat well are used.
   */
  public stock(): void {
    const { ui, food, care, roster } = this.systems
    const pen = this.lookedAtPen()
    if (!pen) {
      ui.showToast('🥣 Look into a pen to stock it')
      return
    }
    const residents = roster.getByPen(pen.id)
    if (residents.length === 0) {
      ui.showToast('🥣 Nobody lives here yet')
      return
    }
    if (care.getTroughCapacity(pen.id) === 0) {
      ui.showToast('🥣 This pen needs a trough first')
      return
    }

    // Foods any resident eats well, best first.
    const wanted = new Map<string, number>()
    for (const c of residents) {
      for (const d of getCreatureEconomyProfile(c.genome).diet) {
        if (d.efficiency >= STOCK_MIN_EFFICIENCY) {
          wanted.set(d.foodId, Math.max(wanted.get(d.foodId) ?? 0, d.efficiency))
        }
      }
    }
    const order = [...wanted].sort((a, b) => b[1] - a[1]).map(([id]) => id)

    const parts: string[] = []
    for (const foodId of order) {
      const item = food.getInventory().find((i) => i.id === foodId)
      if (!item) continue
      const accepted = care.stock(pen.id, foodId, item.quantity)
      if (accepted > 0 && food.removeFood(foodId, accepted)) parts.push(`${accepted} ${foodId}`)
    }
    ui.showToast(
      parts.length > 0
        ? `🥣 Stocked ${pen.id}: ${parts.join(', ')}`
        : '🥣 Nothing to stock: buy food they like in the Shop, or the pen is full'
    )
    this.refresh()
  }

  /** Warnings about the pen's output: no bin to hold it, or a bin about to overflow. */
  private outputProblems(penId: string, residents: number): string[] {
    const { production, park, care } = this.systems
    if (residents === 0) return []
    const farms = park.getPen(penId)?.props.farm ?? 0
    if (farms > 0 && !care.getFarmFood(penId)) {
      return ['farm idle: no resident eats berries or fish well']
    }
    const capacity = production.getBinCapacity(penId)
    if (capacity === 0) return ['no bin: its output is wasted']
    const collector = (park.getPen(penId)?.props.collector ?? 0) > 0
    if (!collector && production.getBinTotal(penId) >= capacity * BIN_FULL_WARNING) {
      return ['bin nearly full: collect (Q) or the output is wasted']
    }
    return []
  }

  private lookedAtPen() {
    const { camera, park, maps } = this.systems
    // The ranch's pens are only in reach at the hub.
    if (!maps.isAtHub()) return null
    const cam = camera.camera
    const dir = cam.getWorldDirection(cam.position.clone())
    const points = [
      { x: cam.position.x, z: cam.position.z },
      ...LOOK_AHEAD_M.map((d) => ({
        x: cam.position.x + dir.x * d,
        z: cam.position.z + dir.z * d,
      })),
    ]
    for (const p of points) {
      const pen = park.getPenAtWorld(p.x, p.z)
      if (pen) return pen
    }
    return null
  }

  /** The pen under the camera or just ahead of it, described for the inspector. */
  private inspect(): PenInspectorView | null {
    const { roster, production, care } = this.systems
    const pen = this.lookedAtPen()
    if (!pen) return null

    const residents = roster.getByPen(pen.id)
    const report = scorePen(
      pen,
      residents.map((c) => ({ id: c.id, genome: c.genome }))
    )
    const quality = new Map(report.occupants.map((o) => [o.creatureId, o]))

    // Collect the requirements that fail for at least one resident.
    const failing = new Set<string>()
    for (const o of report.occupants) {
      for (const [key, r] of Object.entries(o.requirements)) {
        if (r.score < 0.6) failing.add(REQUIREMENT_LABEL[key] ?? key)
      }
    }
    return {
      title: pen.id,
      summary: `${residents.length} creature${residents.length === 1 ? '' : 's'} · ${Math.round(report.freeAreaM2)} m² free · ${pen.enclosure} enclosure · bin ${Math.floor(production.getBinTotal(pen.id))}/${production.getBinCapacity(pen.id)} · trough ${Math.floor(care.getTroughTotal(pen.id))}/${care.getTroughCapacity(pen.id)}${care.getFarmFood(pen.id) ? ` · farm +${care.getFarmOutput(pen.id)} ${care.getFarmFood(pen.id)}/min` : ''}${care.getHopperCapacity(pen.id) > 0 ? ` · hopper ${Math.floor(care.getHopperTotal(pen.id))}/${care.getHopperCapacity(pen.id)}` : ''}`,
      problems: [
        ...[...failing].map((k) => `needs better ${k}`),
        ...this.outputProblems(pen.id, residents.length),
      ],
      rows: residents.map((c) => ({
        name: c.name,
        fullness: c.fullness,
        happiness: c.happiness,
        quality: quality.get(c.id)?.quality ?? 0,
      })),
    }
  }
}
