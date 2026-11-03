/**
 * Map manager (GDD 10.1)
 * Which map the player is on, which expeditions are unlocked, and what it takes to unlock one.
 * The hub is always open. Unlocking is a one-off purchase that also needs enough species in
 * the codex; travelling only needs the map to be unlocked. This class is the rules: swapping
 * the terrain and wild creatures on screen is done by whoever listens to `onTravel`.
 */

import { EXPEDITION_MAPS, getMapDef, HUB_ID, type MapDef } from './maps'

export interface UnlockContext {
  /** Species the player owns (the codex's owned count). */
  ownedSpecies: number
}

export interface MapWallet {
  canAfford(amount: number): boolean
  removeMoney(amount: number, reason?: string): boolean
}

export interface MapSnapshot {
  version: 1
  current: string
  unlocked: string[]
}

export type UnlockCheck = { ok: true } | { ok: false; reason: string }

type TravelListener = (mapId: string, previous: string) => void

export class MapManager {
  private current: string = HUB_ID
  private unlocked = new Set<string>()
  private travelListeners = new Set<TravelListener>()
  private changeListeners = new Set<() => void>()

  public getCurrentId(): string {
    return this.current
  }

  public isAtHub(): boolean {
    return this.current === HUB_ID
  }

  /** The map being visited, or undefined at the hub. */
  public getCurrentDef(): MapDef | undefined {
    return getMapDef(this.current)
  }

  public isUnlocked(id: string): boolean {
    return id === HUB_ID || this.unlocked.has(id)
  }

  public getMaps(): readonly MapDef[] {
    return EXPEDITION_MAPS
  }

  /** Whether the player may pay to unlock a map now, and if not, why. */
  public checkUnlock(id: string, wallet: MapWallet, ctx: UnlockContext): UnlockCheck {
    const def = getMapDef(id)
    if (!def) return { ok: false, reason: 'Unknown map' }
    if (this.isUnlocked(id)) return { ok: false, reason: 'Already unlocked' }
    if (ctx.ownedSpecies < def.unlock.ownedSpecies) {
      return {
        ok: false,
        reason: `Needs ${def.unlock.ownedSpecies} species in your codex (you have ${ctx.ownedSpecies})`,
      }
    }
    if (!wallet.canAfford(def.unlock.coins)) {
      return { ok: false, reason: `Costs ${def.unlock.coins} coins` }
    }
    return { ok: true }
  }

  public unlock(id: string, wallet: MapWallet, ctx: UnlockContext): UnlockCheck {
    const check = this.checkUnlock(id, wallet, ctx)
    if (!check.ok) return check
    const def = getMapDef(id) as MapDef
    if (def.unlock.coins > 0 && !wallet.removeMoney(def.unlock.coins, `Unlocked ${def.name}`)) {
      return { ok: false, reason: `Costs ${def.unlock.coins} coins` }
    }
    this.unlocked.add(id)
    this.notifyChange()
    return { ok: true }
  }

  /** Go to a map (or back to the hub). Fails if it is unknown or locked. */
  public travel(id: string): boolean {
    if (id === this.current) return false
    if (id !== HUB_ID && !getMapDef(id)) return false
    if (!this.isUnlocked(id)) return false
    const previous = this.current
    this.current = id
    for (const listener of this.travelListeners) listener(id, previous)
    this.notifyChange()
    return true
  }

  public onTravel(listener: TravelListener): () => void {
    this.travelListeners.add(listener)
    return () => {
      this.travelListeners.delete(listener)
    }
  }

  public onChange(listener: () => void): () => void {
    this.changeListeners.add(listener)
    return () => {
      this.changeListeners.delete(listener)
    }
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) listener()
  }

  // ---- Save / load --------------------------------------------------------------------------

  /** The current map is not saved: a reload always starts at the hub. */
  public serialize(): MapSnapshot {
    return { version: 1, current: HUB_ID, unlocked: [...this.unlocked] }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<MapSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.unlocked)) return false
    this.unlocked = new Set(
      s.unlocked.filter((id): id is string => typeof id === 'string' && Boolean(getMapDef(id)))
    )
    this.current = HUB_ID
    this.notifyChange()
    return true
  }
}
