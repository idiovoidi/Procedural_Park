import { GAME_CONFIG } from '@core/constants'
import { getRarityTier, RESOURCE_BY_ARCHETYPE } from '@systems/economy'
import { creatureValue } from '@systems/market'
import { RESOURCE_TYPES } from '@systems/production'
import type { MarketView } from '@ui/components/market-panel'
import type { GameSystems } from '../SystemsCoordinator'

const RESOURCE_DISPLAY: Record<string, { label: string; icon: string }> = {
  fibre: { label: 'Fibre', icon: '🌿' },
  down: { label: 'Down', icon: '🪶' },
  brine: { label: 'Brine', icon: '🐚' },
  essence: { label: 'Essence', icon: '✨' },
  shards: { label: 'Shards', icon: '💠' },
}

/**
 * MarketUIManager
 * Connects the market panel to the market, resources, roster and currency: builds the view
 * the panel shows, redraws it while it is open, and turns button clicks into sales.
 */
export class MarketUIManager {
  private systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    const { ui, market, resources, roster, currency } = this.systems
    const panel = ui.getMarketPanel()

    panel.setCallbacks({
      onSellResource: (type, units) => {
        const quote = market.sellResource(type as (typeof RESOURCE_TYPES)[number], units)
        if (quote) ui.showToast(`🪙 +${quote.coins} for ${quote.units} ${type}`)
      },
      onSellAllResources: () => {
        const sold = market.sellAllResources()
        const coins = sold.reduce((sum, q) => sum + q.coins, 0)
        if (sold.length > 0) ui.showToast(`🪙 +${coins} from selling everything`)
      },
      onNudgeFloor: (direction) => {
        const { autoSell } = this.systems
        autoSell.setFloor(
          autoSell.getFloor() + direction * GAME_CONFIG.ECONOMY.PRODUCTION.AUTO_SELL.FLOOR_STEP
        )
      },
      onSellCreature: (id) => {
        const sale = market.sellCreature(id)
        if (sale) ui.showToast(`🪙 +${sale.coins}: sold ${sale.name}`)
      },
    })

    // Redraw whenever anything the panel shows changes.
    const refresh = () => this.refresh()
    market.onChange(refresh)
    this.systems.autoSell.onChange(refresh)
    resources.onChange(refresh)
    roster.onChange(refresh)
    currency.onBalanceChange(refresh)
    refresh()
  }

  public toggle(): void {
    this.systems.ui.getMarketPanel().toggle()
    this.refresh()
  }

  private refresh(): void {
    // Always render: while closed this only updates the balance for the next time it opens.
    this.systems.ui.getMarketPanel().render(this.buildView())
  }

  private buildView(): MarketView {
    const { market, resources, roster, currency } = this.systems
    return {
      balance: currency.getBalance(),
      resources: RESOURCE_TYPES.map((type) => ({
        type,
        label: RESOURCE_DISPLAY[type].label,
        icon: RESOURCE_DISPLAY[type].icon,
        owned: resources.get(type),
        capacity: Math.round(resources.getCapacity(type)),
        unitPrice: market.getUnitPrice(type),
        demand: market.getDemand(type),
      })),
      creatures: roster.list().map((c) => ({
        id: c.id,
        name: c.name,
        description: `${c.genome.archetype} · ${getRarityTier(c.genome.rarity).name} · ${c.ageStage} · makes ${RESOURCE_BY_ARCHETYPE[c.genome.archetype]}`,
        value: creatureValue(c),
      })),
      autoSell: {
        available: this.systems.autoSell.isAvailable(),
        floor: this.systems.autoSell.getFloor(),
      },
    }
  }
}
