import { describeOffspring, sampleOffspring } from '@systems/breeding'
import { generateSpeciesName } from '@systems/creatures/genome'
import { getRarityTier } from '@systems/economy'
import type { BreedingView } from '@ui/components/breeding-panel'
import type { GameSystems } from '../SystemsCoordinator'

const pct = (n: number): string => `${Math.round(n * 100)}%`

/**
 * BreedingUIManager
 * Connects the breeding panel to the breeding system: remembers which den and parents the
 * player picked, builds the view (including the offspring odds), starts breedings, and tells
 * the player when an egg hatches.
 */
export class BreedingUIManager {
  private systems: GameSystems
  private penId: string | null = null
  private parentA: string | null = null
  private parentB: string | null = null

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    const { ui, breeding, roster, park, currency, simClock } = this.systems
    const panel = ui.getBreedingPanel()

    panel.setCallbacks({
      onSelectPen: (penId) => {
        this.penId = penId
        this.parentA = null
        this.parentB = null
        this.refresh()
      },
      onSelectParent: (slot, id) => {
        if (slot === 'a') this.parentA = id
        else this.parentB = id
        this.refresh()
      },
      onBreed: () => this.startBreeding(),
    })

    // Hatchings are announced even when the panel is closed (including ones that happened
    // while the game was closed, which arrive in a burst on load).
    breeding.onHatch((e) => {
      const species = e.isNewSpecies ? ' A NEW SPECIES!' : ''
      const mutation = e.mutated ? ' (it mutated!)' : ''
      const housing = e.penId ? '' : ' No pen has room for it yet.'
      ui.showToast(`🥚 ${e.child.name} hatched!${species}${mutation}${housing}`, 4000)
      this.refresh()
    })

    const refresh = () => this.refresh()
    roster.onChange(refresh)
    park.onEdit(refresh)
    currency.onBalanceChange(refresh)
    // Progress bars: once a second while open.
    simClock.onTick((tick) => {
      if (panel.isOpen() && tick % 1 === 0) this.refresh()
    })
  }

  public toggle(): void {
    this.systems.ui.getBreedingPanel().toggle()
    this.refresh()
  }

  private startBreeding(): void {
    const { breeding, ui } = this.systems
    if (!this.penId || !this.parentA || !this.parentB) return
    const result = breeding.start(this.penId, this.parentA, this.parentB)
    if (!result.ok) {
      ui.showToast(`⚠️ ${result.reason}`)
    } else {
      ui.showToast(`🥚 Breeding started (🪙 -${result.cost}). It hatches in a few minutes.`)
      this.parentA = null
      this.parentB = null
    }
    this.refresh()
  }

  private refresh(): void {
    const panel = this.systems.ui.getBreedingPanel()
    // Building the view runs the odds sampling, so skip it while nobody is looking.
    if (!panel.isOpen()) {
      panel.setBalance(this.systems.currency.getBalance())
      return
    }
    panel.render(this.buildView())
  }

  private buildView(): BreedingView {
    const { breeding, roster, currency } = this.systems

    const denPens = breeding.getDenPens()
    if (!this.penId || !denPens.includes(this.penId)) {
      this.penId = denPens[0] ?? null
      this.parentA = null
      this.parentB = null
    }

    const dens = denPens.map((id) => {
      const status = breeding.getDenStatus(id)
      const residents = roster.getByPen(id).length
      return {
        penId: id,
        label: `${id}: ${status.free}/${status.dens} den free, ${residents} creature${residents === 1 ? '' : 's'}`,
      }
    })

    const candidates = this.penId
      ? roster.getByPen(this.penId).map((c) => ({
          id: c.id,
          label: `${c.name} (${c.genome.archetype}, ${c.genome.size}, ${c.ageStage})`,
        }))
      : []
    const known = new Set(candidates.map((c) => c.id))
    if (this.parentA && !known.has(this.parentA)) this.parentA = null
    if (this.parentB && !known.has(this.parentB)) this.parentB = null

    let problems: string[] = []
    let cost: number | null = null
    let odds: string[] = []
    let samples: BreedingView['samples'] = []
    let canBreed = false

    const a = this.parentA ? roster.get(this.parentA) : undefined
    const b = this.parentB ? roster.get(this.parentB) : undefined
    if (this.penId && a && b) {
      problems = breeding.check(this.penId, a.id, b.id)
      cost = breeding.getCost(a.id, b.id)
      canBreed = problems.length === 0
      odds = this.formatOdds(a.genome, b.genome)
      samples = sampleOffspring(a.genome, b.genome).map((g) => ({
        name: generateSpeciesName(g),
        detail: `${g.archetype} · ${g.size} · ${getRarityTier(g.rarity).name}`,
      }))
    }

    const jobs = breeding.getJobs().map((job) => ({
      id: job.id,
      label: `${job.parentNames[0]} × ${job.parentNames[1]}`,
      progress: breeding.getProgress(job),
      secondsLeft: breeding.getSecondsLeft(job),
    }))

    return {
      balance: currency.getBalance(),
      dens,
      penId: this.penId,
      candidates,
      parentA: this.parentA,
      parentB: this.parentB,
      problems,
      cost,
      odds,
      samples,
      canBreed,
      jobs,
    }
  }

  private formatOdds(
    a: Parameters<typeof describeOffspring>[0],
    b: Parameters<typeof describeOffspring>[1]
  ): string[] {
    const odds = describeOffspring(a, b)
    const list = (items: Array<{ label: string; chance: number }>) =>
      items.map((o) => `${pct(o.chance)} ${o.label}`).join(' · ')

    const lines = [
      `Body: ${list(odds.body)}`,
      `Size: ${list(odds.size)}`,
      `Temperament: ${list(odds.temperament)}`,
      odds.rarity.tierMin === odds.rarity.tierMax
        ? `Rarity: ${odds.rarity.tierMin}`
        : `Rarity: ${odds.rarity.tierMin} to ${odds.rarity.tierMax}`,
    ]
    if (odds.parts.length > 0) {
      lines.push(
        `Parts: ${odds.parts
          .slice(0, 6)
          .map((p) => `${p.label} ${pct(p.chance)}`)
          .join(' · ')}`
      )
    }
    lines.push(
      `Colours blend between the parents. ${pct(odds.mutationChance)} chance of a small mutation.`
    )
    return lines
  }
}
