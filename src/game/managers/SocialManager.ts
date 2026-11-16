import type { Genome } from '@systems/creatures/genome'
import { getRarityTier } from '@systems/economy'
import {
  CodexShare,
  DuelShare,
  JointBreeding,
  SocialChannel,
  TradeManager,
  VisitShare,
} from '@systems/social'
import type { TradePanelView } from '@ui/components/trade-panel'
import type { GameSystems } from '../SystemsCoordinator'
import { VisitManager } from './VisitManager'

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
  public readonly codexShare: CodexShare
  public readonly visitShare: VisitShare
  public readonly visit: VisitManager
  public readonly joint: JointBreeding
  public readonly duel: DuelShare

  constructor(systems: GameSystems) {
    this.systems = systems
    this.channel = new SocialChannel((text) => systems.multiplayer.sendSocial(text))
    this.codexShare = new CodexShare(systems.codex, this.channel)
    this.visit = new VisitManager(systems)
    this.visitShare = new VisitShare(this.channel, {
      // What a visitor may see: the pens and the creatures living in them, as data only.
      getSnapshot: () => ({ grid: systems.park.serialize(), roster: systems.roster.serialize() }),
      onVisitorArrived: () => systems.ui.showToast('🏡 Your friend is visiting your park', 4000),
      onVisitorLeft: () => systems.ui.showToast('🏡 Your friend left your park'),
      onSnapshot: (snapshot) => {
        this.visit.begin(snapshot)
        this.refresh()
      },
    })
    this.joint = new JointBreeding(systems.roster, this.channel, (args) => {
      const penId = systems.roster.get(args.myParentId)?.penId
      if (!penId) return { ok: false, reason: 'Your parent must live in a pen with a breeding den' }
      const r = systems.breeding.startJoint({ penId, ...args })
      return r.ok ? { ok: true } : { ok: false, reason: r.reason }
    })
    this.duel = new DuelShare(this.channel)
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
      if (!connected) {
        this.trade.reset()
        this.visitShare.reset()
        this.joint.reset()
        this.duel.reset()
        this.visit.end(false)
      } else this.codexShare.sendAll()
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
      onProposeJoint: (id) => {
        const r = this.joint.propose(id)
        ui.showToast(r.ok ? '🥚 Proposal sent' : `⚠️ ${r.reason}`)
        this.refresh()
      },
      onCancelJoint: (id) => {
        this.joint.cancel(id)
        this.refresh()
      },
      onAcceptJoint: (id, creatureId) => {
        const r = this.joint.accept(id, creatureId)
        if (!r.ok) ui.showToast(`⚠️ ${r.reason}`)
        this.refresh()
      },
      onDeclineJoint: (id) => {
        this.joint.decline(id)
        this.refresh()
      },
      onVisit: () => {
        if (!this.systems.maps.isAtHub()) {
          ui.showToast('🧭 Go home before visiting a friend')
          return
        }
        this.visitShare.request()
        this.refresh()
      },
      onLeaveVisit: () => {
        this.visit.end()
        this.visitShare.leave()
        this.refresh()
      },
    })

    this.joint.onEvent((e) => {
      switch (e.kind) {
        case 'proposed':
          ui.showToast(`🥚 ${e.proposal.name} is offered for a joint breeding. Open Trade`, 5000)
          break
        case 'started':
          ui.showToast(`🥚 Breeding together with ${e.friendName}: you each get a child`, 5000)
          break
        case 'declined':
          ui.showToast(`🥚 Your friend declined to breed ${e.name}`)
          break
        case 'cancelled':
          ui.showToast(`🥚 ${e.name} is no longer on offer`)
          break
        case 'failed':
          ui.showToast(`⚠️ Your friend started, but you could not: ${e.reason}`, 5000)
          break
      }
      this.refresh()
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
    // Discoveries go to the friend as they happen; theirs are logged here.
    this.systems.codex.onChange((entry, isNew) => {
      if (isNew && multiplayer.isConnected()) this.codexShare.sendEntry(entry)
    })
    this.codexShare.onLearned((n) =>
      ui.showToast(`📖 Your friend shared ${n} new species with your codex`, 4000)
    )
    this.systems.roster.onChange(() => this.refresh())
    this.refresh()
  }

  public toggle(): void {
    this.systems.ui.getTradePanel().toggle()
    this.refresh()
  }

  /** An adult that lives in a pen with a free breeding den, and is not already breeding. */
  private canBreedTogether(creatureId: string): boolean {
    const { roster, park, breeding } = this.systems
    const c = roster.get(creatureId)
    if (!c || c.ageStage !== 'adult' || !c.penId || !park.getPen(c.penId)) return false
    if (breeding.getJobs().some((j) => j.parentIds.includes(creatureId))) return false
    return breeding.getDenStatus(c.penId).free > 0
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
        canBreed: this.canBreedTogether(c.id),
        blocked: offered.has(c.id)
          ? 'already offered'
          : this.systems.breeding.getJobs().some((j) => j.parentIds.includes(c.id))
            ? 'busy breeding'
            : '',
      })),
      visit: { visiting: this.visit.isVisiting(), waiting: this.visitShare.isWaiting() },
      joint: {
        incoming: this.joint.getIncoming().map((p) => ({
          id: p.id,
          name: p.name,
          description: describe(p.genome),
          candidates: roster
            .list()
            .filter((c) => this.canBreedTogether(c.id))
            .map((c) => ({ id: c.id, name: c.name })),
        })),
        outgoing: this.joint.getOutgoing().map((o) => ({ id: o.id, name: o.name })),
      },
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
