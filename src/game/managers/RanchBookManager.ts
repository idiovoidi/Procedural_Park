import { GAME_CONFIG } from '@core/constants'
import type { CodexEntry } from '@systems/codex'
import type { Genome } from '@systems/creatures/genome'
import { getCreatureEconomyProfile, getRarityTier } from '@systems/economy'
import { creatureValue } from '@systems/market'
import { canAddOccupant } from '@systems/park'
import type { CodexRow, PenOption, RanchBookView, RosterRow } from '@ui/components/ranch-book'
import type { GameSystems } from '../SystemsCoordinator'

const NEEDED = GAME_CONFIG.ECONOMY.CODEX.STUDY_PHOTOS_REQUIRED

const swatch = (g: Genome): string =>
  `hsl(${Math.round(g.palette.baseHue * 360)} ${Math.round(g.palette.saturation * 100)}% ${Math.round(g.palette.lightness * 100)}%)`

const FOUND: Record<CodexEntry['foundBy'], string> = {
  photographed: 'photographed',
  captured: 'captured',
  bred: 'bred',
  shared: 'shared by a friend',
}

/**
 * RanchBookManager
 * Connects the Ranch Book (roster and codex) to the game: builds the rows it shows, lets the
 * player move a creature to another pen or rename it, and keeps the book fresh while open.
 */
export class RanchBookManager {
  private systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    const { ui, roster, codex, park, simClock } = this.systems
    const book = ui.getRanchBook()

    book.setCallbacks({
      onMove: (id, penId) => this.move(id, penId),
      onRename: (id) => this.rename(id),
      onOpenCards: () => ui.openSavedCards(),
    })

    // New species are worth a fanfare, whichever way they arrive.
    codex.onChange((entry, isNew) => {
      if (isNew && entry.owned) ui.showToast(`📖 New species: ${entry.name}`, 3000)
      this.refresh()
    })
    const refresh = () => this.refresh()
    roster.onChange(refresh)
    park.onEdit(refresh)
    // Stat bars move slowly: refresh once a minute while open (patched in place).
    simClock.onTick((tick) => {
      if (book.isOpen() && tick % 15 === 0) this.refresh()
    })
  }

  public toggle(): void {
    this.systems.ui.getRanchBook().toggle()
    this.refresh()
  }

  private move(creatureId: string, penId: string | null): void {
    const { roster, park, ui } = this.systems
    const creature = roster.get(creatureId)
    if (!creature) return

    if (penId) {
      const pen = park.getPen(penId)
      const residents = roster
        .getByPen(penId)
        .filter((c) => c.id !== creatureId)
        .map((c) => ({ id: c.id, genome: c.genome }))
      let why: string | null = null
      if (!pen) {
        why = 'that pen is not closed'
      } else {
        const verdict = canAddOccupant(pen, residents, creature.genome)
        if (!verdict.ok) {
          why =
            verdict.reason === 'space'
              ? 'there is no room'
              : 'it cannot share with the creatures there'
        }
      }
      if (why) {
        ui.showToast(`⚠️ ${creature.name} cannot move: ${why}`)
        this.refresh()
        return
      }
    }
    roster.assignToPen(creatureId, penId)
    ui.showToast(
      penId ? `🏠 ${creature.name} moved to ${penId}` : `🏠 ${creature.name} has no pen now`
    )
    this.refresh()
  }

  private rename(creatureId: string): void {
    const { roster, ui } = this.systems
    const creature = roster.get(creatureId)
    if (!creature) return
    const next = window.prompt('Name this creature', creature.name)
    if (next && roster.rename(creatureId, next.slice(0, 40))) ui.showToast('✏️ Renamed')
    this.refresh()
  }

  private refresh(): void {
    const book = this.systems.ui.getRanchBook()
    if (!book.isOpen()) return
    book.render(this.buildView())
  }

  private penOptions(creatureId: string): PenOption[] {
    const { roster, park } = this.systems
    const creature = roster.get(creatureId)
    const options: PenOption[] = [{ value: '', label: 'No pen', enabled: true }]
    if (!creature) return options

    for (const pen of park.getPens()) {
      const residents = roster
        .getByPen(pen.id)
        .filter((c) => c.id !== creatureId)
        .map((c) => ({ id: c.id, genome: c.genome }))
      const fits = canAddOccupant(pen, residents, creature.genome).ok
      const here = creature.penId === pen.id
      options.push({
        value: pen.id,
        label: `${pen.id} (${residents.length + (here ? 1 : 0)} in it)${fits || here ? '' : ' — no fit'}`,
        enabled: fits || here,
      })
    }
    // A creature whose pen has since been opened keeps its assignment: show it.
    if (creature.penId && !park.getPen(creature.penId)) {
      options.push({ value: creature.penId, label: `${creature.penId} (open)`, enabled: true })
    }
    return options
  }

  private buildView(): RanchBookView {
    const { roster, codex } = this.systems

    const rosterRows: RosterRow[] = roster.list().map((c) => {
      const parents = c.parentIds
        ?.map((id) => roster.get(id)?.name)
        .filter((n): n is string => Boolean(n))
      const lineage =
        c.generation === 0
          ? 'founder'
          : `generation ${c.generation}${parents && parents.length > 0 ? `, from ${parents.join(' × ')}` : ''}`
      return {
        id: c.id,
        name: c.name,
        swatch: swatch(c.genome),
        description: `${c.genome.archetype} · ${c.genome.size} · ${getRarityTier(c.genome.rarity).name} · ${c.ageStage}`,
        penId: c.penId,
        fullness: c.fullness,
        happiness: c.happiness,
        trust: c.trust,
        lineage,
        value: creatureValue(c),
        penOptions: this.penOptions(c.id),
      }
    })

    const codexRows: CodexRow[] = codex.list().map((e) => {
      const profile = e.studied ? getCreatureEconomyProfile(e.best.genome) : null
      const details: string[] = []
      if (profile) {
        const diet = profile.diet
          .filter((d) => d.efficiency > 0.05)
          .slice(0, 3)
          .map((d) => `${d.foodId} ${Math.round(d.efficiency * 100)}%`)
        const h = profile.habitat
        details.push(`Eats: ${diet.join(' · ')}`)
        details.push(
          `Needs: ${h.areaM2} m² · ${h.enclosure} enclosure${h.water !== 'none' ? ` · ${h.water} water` : ''} · prefers ${h.biomes.join(', ')}`
        )
        details.push(
          `Makes ${profile.resource} (${profile.baseOutputPerCycle} per cycle) · ${profile.rarity.name} value ×${profile.rarity.multiplier} · ${e.best.genome.temperament}`
        )
      }
      const left = Math.max(0, NEEDED - e.photos)
      return {
        speciesId: e.speciesId,
        name: e.name,
        swatch: swatch(e.best.genome),
        found: FOUND[e.foundBy],
        owned: e.owned,
        studied: e.studied,
        best: `${e.best.name} (${getRarityTier(e.best.rarity).name})`,
        details,
        hint: `Photograph it ${left} more time${left === 1 ? '' : 's'} (T) to learn its diet and habitat.`,
      }
    })

    return {
      creatureCount: roster.count(),
      speciesCount: codex.count(),
      ownedSpeciesCount: codex.ownedCount(),
      roster: rosterRows,
      codex: codexRows,
    }
  }
}
