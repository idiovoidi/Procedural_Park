import { describeContract } from '@systems/contracts'
import { getRarityTier } from '@systems/economy'
import type { ContractBoardView } from '@ui/components/contract-board'
import type { GameSystems } from '../SystemsCoordinator'

/**
 * ContractUIManager
 * Connects the Contract Board panel to the board, roster and wallet: builds the view the panel
 * shows, redraws it while it is open, and turns "Deliver" clicks into fulfilments.
 */
export class ContractUIManager {
  private systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    const { ui, contracts, roster, simClock } = this.systems
    const panel = ui.getContractBoard()

    panel.setCallbacks({
      onDeliver: (contractId, creatureId) => {
        const result = contracts.fulfil(contractId, creatureId)
        ui.showToast(
          result.ok
            ? `📜 +🪙 ${result.reward}: delivered ${result.creatureName}`
            : `⚠️ ${result.reason}`
        )
      },
    })

    const refresh = () => this.refresh()
    contracts.onChange(refresh)
    roster.onChange(refresh)
    // Countdowns tick down once a minute (patched in place).
    simClock.onTick((tick) => {
      if (panel.isOpen() && tick % 15 === 0) refresh()
    })
    refresh()
  }

  public toggle(): void {
    this.systems.ui.getContractBoard().toggle()
    this.refresh()
  }

  private refresh(): void {
    const { ui, contracts } = this.systems
    const panel = ui.getContractBoard()
    if (!panel.isOpen()) return
    const view: ContractBoardView = {
      contracts: contracts.getContracts().map((c) => ({
        id: c.id,
        title: describeContract(c),
        reward: c.reward,
        secondsLeft: contracts.getSecondsLeft(c),
        candidates: contracts.getCandidates(c.id).map((creature) => ({
          id: creature.id,
          name: creature.name,
          description: `${creature.genome.archetype} · ${creature.genome.size} · ${getRarityTier(creature.genome.rarity).name}`,
        })),
      })),
    }
    panel.render(view)
  }
}
