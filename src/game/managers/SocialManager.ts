import type { Genome } from '@systems/creatures/genome'
import { getRarityTier } from '@systems/economy'
import { SocialChannel, TradeManager } from '@systems/social'
import type { TradePanelView } from '@ui/components/trade-panel'
import type { GameSystems } from '../SystemsCoordinator'

const describe = (g: Genome): string =>
  `${g.archetype} · ${g.size} · ${getRarityTier(g.rarity).name}`

/**
 * SocialManager
 * Connects the friend features to the live multiplayer link: a chunked social channel over the
 * data channel, card trading on top of it, and the Trade panel that drives it.
 */
export class SocialManager {
  private readonly systems: GameSystems
  public readonly channel: SocialChannel
  public readonly trade: TradeManager

  constructor(systems: GameSystems) {
    this.systems = systems
    this.channel = new SocialChannel((text) => systems.multiplayer.sendSocial(text))
    this.trade = new TradeManager(systems.roster, this.channel, {
      // A creature in the breeding den cannot leave until its egg has hatched.
      isLocked: (id) => systems.breeding.getJobs().some((j) => j.parentIds.includes(id)),
    })
  }

  public initialize(): void {
    const { ui, multiplayer } = this.systems
    const panel = ui.getTradePanel()

    multiplayer.setSocialReceiver((text) => this.channel.receive(text))
    multiplayer.onConnectionChanged = (connected) => {
      if (!connected) this.trade.reset()
      this.refresh()
    }

    panel.setCallbacks({
      onOffer: (id) => {
        const r = this.trade.offer(id)
        ui.showToast(r.ok ? '🤝 Offer sent' : `⚠️ ${r.reason}`)
        this.refresh()
      },
      onCancel: (id) => {
        this.trade.cancel(id)
        this.refresh()
      },
      onAccept: (id) => {
        this.trade.accept(id)
        this.refresh()
      },
      onDecline: (id) => {
        this.trade.decline(id)
        this.refresh()
      },
    })

    this.trade.onEvent((e) => {
      switch (e.kind) {
        case 'offered':
          ui.showToast(
            `🤝 Your friend offers ${e.offer.name} (${describe(e.offer.genome)}). Open Trade`,
            5000
          )
          break
        case 'received':
          ui.showToast(`🎁 ${e.offer.name} joined your roster`, 4000)
          break
        case 'sent':
          ui.showToast(`🤝 ${e.name} went to your friend`, 4000)
          break
        case 'declined':
          ui.showToast(`🤝 Your friend declined ${e.name}`)
          break
        case 'cancelled':
          ui.showToast(`🤝 ${e.name} is no longer on offer`)
          break
        case 'voided':
          ui.showToast(`⚠️ Trade for ${e.name} fell through: ${e.reason}`)
          break
      }
      this.refresh()
    })
    this.systems.roster.onChange(() => this.refresh())
    this.refresh()
  }

  public toggle(): void {
    this.systems.ui.getTradePanel().toggle()
    this.refresh()
  }

  private refresh(): void {
    const { ui, roster, multiplayer } = this.systems
    const panel = ui.getTradePanel()
    if (!panel.isOpen()) return
    const offered = new Set(this.trade.getOutgoing().map((o) => o.creatureId))
    const view: TradePanelView = {
      connected: multiplayer.isConnected(),
      mine: roster.list().map((c) => ({
        id: c.id,
        name: c.name,
        description: `${describe(c.genome)} · ${c.ageStage}`,
        blocked: offered.has(c.id)
          ? 'already offered'
          : this.systems.breeding.getJobs().some((j) => j.parentIds.includes(c.id))
            ? 'busy breeding'
            : '',
      })),
      outgoing: this.trade.getOutgoing().map((o) => ({ id: o.id, name: o.name })),
      incoming: this.trade.getIncoming().map((i) => ({
        id: i.offer.id,
        name: i.offer.name,
        description: describe(i.offer.genome),
        accepted: i.accepted,
      })),
    }
    panel.render(view)
  }
}
