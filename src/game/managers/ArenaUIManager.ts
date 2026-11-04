import { GAME_CONFIG } from '@core/constants'
import { type BattleResult, deriveCombatStats, type TeamMember } from '@systems/arena'
import { getRarityTier } from '@systems/economy'
import type { ArenaPanelView } from '@ui/components/arena-panel'
import type { GameSystems } from '../SystemsCoordinator'
import type { SocialManager } from './SocialManager'

const A = GAME_CONFIG.ECONOMY.ARENA

/** Lines describing a fight: who hit whom, and how it ended. */
function reportLines(result: BattleResult, mine: TeamMember[], theirs: TeamMember[]): string[] {
  const names: Record<string, string> = {}
  for (const [i, m] of mine.slice(0, A.TEAM_SIZE).entries()) names[`a${i}`] = m.name
  for (const [i, m] of theirs.slice(0, A.TEAM_SIZE).entries()) names[`b${i}`] = m.name
  const lines: string[] = []
  for (const e of result.events) {
    if (lines.length >= 14) break
    const actor = names[e.actor] ?? e.actor
    const target = names[e.target] ?? e.target
    if (e.kind === 'dodge') lines.push(`R${e.round}: ${target} dodges ${actor}`)
    else if (e.kind === 'fall') lines.push(`R${e.round}: ${target} falls`)
    else if (e.kind === 'reflect')
      lines.push(`R${e.round}: ${actor}'s spines hurt ${target} (${e.damage})`)
    else
      lines.push(
        `R${e.round}: ${actor} ${e.kind === 'crit' ? 'crits' : e.kind === 'splash' ? 'sweeps' : 'hits'} ${target} for ${e.damage}`
      )
  }
  if (result.events.length > lines.length)
    lines.push(`… ${result.events.length - lines.length} more moves`)
  lines.push(`${result.rounds} rounds`)
  return lines
}

/**
 * ArenaUIManager
 * Connects the Arena panel to the ladder and to friend duels: tracks the picked team, runs
 * fights, and shows the report.
 */
export class ArenaUIManager {
  private readonly systems: GameSystems
  private readonly social: () => SocialManager
  private team: string[] = []
  private report: ArenaPanelView['report'] = null

  constructor(systems: GameSystems, social: () => SocialManager) {
    this.systems = systems
    this.social = social
  }

  public initialize(): void {
    const { ui, arena, roster, multiplayer } = this.systems
    const panel = ui.getArenaPanel()

    panel.setCallbacks({
      onToggle: (id) => {
        if (this.team.includes(id)) this.team = this.team.filter((t) => t !== id)
        else if (this.team.length < A.TEAM_SIZE) this.team.push(id)
        this.refresh()
      },
      onFight: (rung) => {
        const out = arena.fightLadder(this.team, rung)
        if (!out.ok) {
          ui.showToast(`⚠️ ${out.reason}`)
          return
        }
        const title = out.won
          ? out.firstWin
            ? `Victory on rung ${rung}! +🪙 ${out.coins}`
            : `Victory on rung ${rung} (+🪙 ${out.coins})`
          : `Defeated on rung ${rung}`
        this.report = { title, lines: reportLines(out.result, out.team, out.foes), won: out.won }
        this.refresh()
      },
      onChallenge: () => {
        const r = this.social().duel.challenge(this.teamMembers())
        ui.showToast(r.ok ? '⚔️ Challenge sent' : `⚠️ ${r.reason}`)
        this.refresh()
      },
      onCancelDuel: () => {
        this.social().duel.cancel()
        this.refresh()
      },
      onAcceptDuel: () => {
        const r = this.social().duel.accept(this.teamMembers())
        if (!r.ok) ui.showToast(`⚠️ ${r.reason}`)
        this.refresh()
      },
      onDeclineDuel: () => {
        this.social().duel.decline()
        this.refresh()
      },
    })

    this.social().duel.onEvent((e) => {
      switch (e.kind) {
        case 'challenged':
          ui.showToast('⚔️ Your friend challenges you to a duel. Open Arena', 5000)
          break
        case 'declined':
          ui.showToast('⚔️ Your friend declined the duel')
          break
        case 'cancelled':
          ui.showToast('⚔️ The challenge was withdrawn')
          break
        case 'result': {
          const o = e.outcome
          this.report = {
            title:
              o.iWon === null
                ? 'Duel: a draw'
                : o.iWon
                  ? 'Duel: you won!'
                  : 'Duel: your friend won',
            lines: reportLines(
              o.result,
              o.iChallenged ? o.mine : o.theirs,
              o.iChallenged ? o.theirs : o.mine
            ),
            won: o.iWon,
          }
          ui.showToast(this.report.title, 4000)
          break
        }
      }
      this.refresh()
    })

    arena.onChange(() => this.refresh())
    roster.onChange(() => this.refresh())
    multiplayer.onConnectionChanged = ((prev) => (connected: boolean) => {
      prev(connected)
      this.refresh()
    })(multiplayer.onConnectionChanged)
  }

  public toggle(): void {
    this.systems.ui.getArenaPanel().toggle()
    this.refresh()
  }

  private teamMembers(): TeamMember[] {
    const { roster } = this.systems
    return this.team.flatMap((id) => {
      const c = roster.get(id)
      return c ? [{ name: c.name, genome: c.genome }] : []
    })
  }

  private refresh(): void {
    const { ui, arena, roster, multiplayer } = this.systems
    const panel = ui.getArenaPanel()
    if (!panel.isOpen()) return
    // Drop picks that have since left the roster or grown out of eligibility.
    this.team = this.team.filter((id) => {
      const c = roster.get(id)
      return c && arena.canFight(c)
    })

    const incoming = this.social().duel.getIncoming()
    const open = arena.getOpenRung()
    const view: ArenaPanelView = {
      fighters: roster
        .list()
        .filter((c) => arena.canFight(c))
        .map((c) => {
          const s = deriveCombatStats(c.genome)
          const specials = [
            s.firstStrike > 0 ? 'gore' : '',
            s.reflect > 0 ? 'spines' : '',
            s.splash > 0 ? 'sweep' : '',
            s.dodge > 0 ? 'dodge' : '',
            s.damageTaken < 1 ? 'armour' : '',
          ].filter(Boolean)
          return {
            id: c.id,
            name: c.name,
            description: `${c.genome.archetype} · ${c.genome.size} · ${getRarityTier(c.genome.rarity).name}`,
            selected: this.team.includes(c.id),
            combat: `HP ${s.maxHp} · hits ${s.hits}${specials.length ? ` · ${specials.join(', ')}` : ''}`,
            disabled: this.team.length >= A.TEAM_SIZE,
          }
        }),
      selectedCount: this.team.length,
      teamSize: A.TEAM_SIZE,
      ladder: Array.from({ length: arena.getRungCount() }, (_, i) => {
        const rung = i + 1
        const r = arena.rewardFor(rung)
        return {
          rung,
          state: (rung <= arena.getBeaten() ? 'beaten' : rung <= open ? 'open' : 'locked') as
            | 'open'
            | 'beaten'
            | 'locked',
          reward: `first win 🪙 ${r.firstWin}, then 🪙 ${r.repeat}`,
        }
      }),
      report: this.report,
      duel: {
        connected: multiplayer.isConnected(),
        waiting: this.social().duel.hasOutgoing(),
        incoming: incoming ? incoming.from.map((m) => m.name).join(', ') : null,
      },
    }
    panel.render(view)
  }
}
