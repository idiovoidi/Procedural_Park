import { HUB_ID } from '@systems/maps'
import type { MapPanelView } from '@ui/components/map-panel'
import type { GameSystems } from '../SystemsCoordinator'

/**
 * MapUIManager
 * Connects the map panel to the MapManager, wallet and codex: builds the rows (unlock status and
 * reasons) and turns clicks into unlocking and travelling.
 */
export class MapUIManager {
  private readonly systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    const { ui, maps, currency, codex } = this.systems
    const panel = ui.getMapPanel()

    panel.setCallbacks({
      onUnlock: (id) => {
        const result = maps.unlock(id, currency, { ownedSpecies: codex.ownedCount() })
        ui.showToast(result.ok ? '🧭 Map unlocked' : `⚠️ ${result.reason}`)
      },
      onTravel: (id) => {
        if (maps.travel(id)) panel.close()
      },
    })

    const refresh = () => this.refresh()
    maps.onChange(refresh)
    currency.onBalanceChange(refresh)
    codex.onChange(refresh)
    refresh()
  }

  public toggle(): void {
    this.systems.ui.getMapPanel().toggle()
    this.refresh()
  }

  private refresh(): void {
    const { ui, maps, currency, codex } = this.systems
    const panel = ui.getMapPanel()
    if (!panel.isOpen()) return

    const ctx = { ownedSpecies: codex.ownedCount() }
    const view: MapPanelView = {
      maps: [
        {
          id: HUB_ID,
          name: 'Hub Park',
          description: 'Your ranch: build, breed and sell.',
          note: '',
          state: maps.isAtHub() ? 'here' : 'open',
          lockReason: '',
          unlockCost: 0,
          canUnlock: false,
        },
        ...maps.getMaps().map((m) => {
          const check = maps.checkUnlock(m.id, currency, ctx)
          const top = Object.entries(m.archetypeLean).sort((a, b) => b[1] - a[1])[0][0]
          return {
            id: m.id,
            name: m.name,
            description: m.description,
            note: `Mostly ${top} founders · ${m.wildCount} wild · rarity +${Math.round(m.rarityBonus * 100)}%`,
            state: (maps.getCurrentId() === m.id
              ? 'here'
              : maps.isUnlocked(m.id)
                ? 'open'
                : 'locked') as 'here' | 'open' | 'locked',
            lockReason: check.ok ? '' : check.reason,
            unlockCost: m.unlock.coins,
            canUnlock: check.ok,
          }
        }),
      ],
    }
    panel.render(view)
  }
}
