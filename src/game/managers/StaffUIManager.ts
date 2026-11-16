import { GAME_CONFIG } from '@core/constants'
import type { StaffPanelView } from '@ui/components/staff-panel'
import type { GameSystems } from '../SystemsCoordinator'

const S = GAME_CONFIG.ECONOMY.STAFF

/** Connects the Keepers panel to the staff system, the pens and the wallet. */
export class StaffUIManager {
  private readonly systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public initialize(): void {
    const { ui, staff, currency, park, roster } = this.systems
    ui.getStaffPanel().setCallbacks({
      onHire: (penId) => {
        const r = staff.hire(penId)
        ui.showToast(r.ok ? `🧑‍🌾 Keeper hired for ${penId}` : `⚠️ ${r.reason}`)
      },
      onDismiss: (penId) => {
        staff.dismiss(penId)
        ui.showToast(`🧑‍🌾 Keeper let go from ${penId}`)
      },
    })
    const refresh = () => this.refresh()
    staff.onChange(refresh)
    currency.onBalanceChange(refresh)
    park.onEdit(refresh)
    roster.onChange(refresh)
  }

  public toggle(): void {
    this.systems.ui.getStaffPanel().toggle()
    this.refresh()
  }

  private refresh(): void {
    const { ui, staff, currency, park, roster } = this.systems
    const panel = ui.getStaffPanel()
    if (!panel.isOpen()) return
    const view: StaffPanelView = {
      pens: park.getPens().map((p) => ({
        penId: p.id,
        residents: roster.getByPen(p.id).length,
        keeper: staff.hasKeeper(p.id),
        unpaid: staff.isUnpaid(p.id),
      })),
      hireCost: S.HIRE_COST,
      wage: S.WAGE_PER_CYCLE,
      balance: currency.getBalance(),
    }
    panel.render(view)
  }
}
