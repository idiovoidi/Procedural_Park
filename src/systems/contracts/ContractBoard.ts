/**
 * Contract Board (GDD 7.3)
 * Buyers post requests for creatures with specific traits and pay a premium over market. This
 * is the bridge between breeding and income: the player breeds toward a trait set.
 *
 * Every contract is built from a seeded "template" creature, so it is always satisfiable: the
 * requirements are traits that template really has. The reward is what that template would sell
 * for, plus a bonus per requirement. The same seed gives the same contracts.
 */

import { GAME_CONFIG } from '@core/constants'
import { OPTIONAL_PARTS } from '@systems/breeding'
import { type Genome, generateGenome, hashSeed } from '@systems/creatures/genome'
import { createSeededRandom } from '@systems/creatures/genome/random'
import { getRarityTier } from '@systems/economy'
import { creatureValue } from '@systems/market'
import type { OwnedCreature, Roster } from '@systems/roster'

const C = GAME_CONFIG.ECONOMY.CONTRACTS
const RARITY_TIERS = GAME_CONFIG.ECONOMY.RARITY_TIERS

export type Requirement =
  | { kind: 'archetype'; value: string }
  | { kind: 'size'; value: string }
  /** Minimum rarity tier index (1 = uncommon ...). */
  | { kind: 'tier'; value: number }
  | { kind: 'part'; value: string }

export interface Contract {
  id: string
  /** Which board slot it sits in. */
  slot: number
  requirements: Requirement[]
  reward: number
  postedTick: number
  expiresTick: number
}

export interface CoinPurse {
  addMoney(amount: number, reason?: string): void
}

export type FulfilResult =
  | { ok: true; reward: number; creatureName: string; contract: Contract }
  | { ok: false; reason: string }

export interface ContractSnapshot {
  version: 1
  nextNumber: number
  now: number
  slots: Array<Contract | null>
  refillAt: number[]
}

const PART_BY_LABEL = new Map(OPTIONAL_PARTS)

/** Plain-words version of one requirement. */
export function describeRequirement(r: Requirement): string {
  switch (r.kind) {
    case 'archetype':
      return `${r.value}`
    case 'size':
      return `${r.value} size`
    case 'tier':
      return `${RARITY_TIERS[r.value]?.name ?? 'rare'} or better`
    case 'part':
      return `has ${r.value}`
  }
}

export function describeContract(c: Pick<Contract, 'requirements'>): string {
  return c.requirements.map(describeRequirement).join(' · ')
}

export function meetsRequirement(r: Requirement, genome: Genome): boolean {
  switch (r.kind) {
    case 'archetype':
      return genome.archetype === r.value
    case 'size':
      return genome.size === r.value
    case 'tier':
      return getRarityTier(genome.rarity).index >= r.value
    case 'part':
      return PART_BY_LABEL.get(r.value)?.(genome) ?? false
  }
}

/** Whether a creature can be delivered against a contract. */
export function matchesContract(
  contract: Pick<Contract, 'requirements'>,
  creature: Pick<OwnedCreature, 'genome' | 'ageStage'>
): boolean {
  return (
    creature.ageStage === 'adult' &&
    contract.requirements.every((r) => meetsRequirement(r, creature.genome))
  )
}

/** Build contract number `number` for a slot. Pure and seeded. */
export function generateContract(
  baseSeed: number,
  number: number,
  slot: number,
  now: number
): Contract {
  const seed = hashSeed(baseSeed, number, 0x636f6e)
  const rand = createSeededRandom(seed)
  const template = generateGenome(hashSeed(seed, 1))

  const candidates: Requirement[] = [
    { kind: 'archetype', value: template.archetype },
    { kind: 'size', value: template.size },
  ]
  const tier = getRarityTier(template.rarity).index
  if (tier >= 1) candidates.push({ kind: 'tier', value: tier })
  for (const [label, has] of OPTIONAL_PARTS) {
    if (has(template)) candidates.push({ kind: 'part', value: label })
  }

  const wanted = C.REQUIREMENTS_BY_SLOT[Math.min(slot, C.REQUIREMENTS_BY_SLOT.length - 1)]
  // Seeded shuffle, then take the first few.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const requirements = candidates.slice(0, Math.max(1, wanted))

  // Reward: what the ideal match is worth, with a bonus per requirement.
  const ideal = creatureValue({ genome: template, ageStage: 'adult' })
  const reward = Math.round(
    ideal * C.REWARD_SCALE * (C.REWARD_BASE + C.REWARD_PER_REQUIREMENT * requirements.length)
  )
  return {
    id: `k${number}`,
    slot,
    requirements,
    reward,
    postedTick: now,
    expiresTick: now + C.DURATION_TICKS,
  }
}

type Listener = () => void

export class ContractBoard {
  private readonly roster: Roster
  private readonly purse: CoinPurse
  private readonly baseSeed: number
  private slots: Array<Contract | null> = Array.from({ length: C.BOARD_SLOTS }, () => null)
  private refillAt: number[] = Array.from({ length: C.BOARD_SLOTS }, () => 0)
  private nextNumber = 1
  private now = 0
  private listeners = new Set<Listener>()

  constructor(roster: Roster, purse: CoinPurse, baseSeed: number) {
    this.roster = roster
    this.purse = purse
    this.baseSeed = baseSeed
  }

  public getContracts(): Contract[] {
    return this.slots.filter((c): c is Contract => c !== null)
  }

  public get(id: string): Contract | undefined {
    return this.getContracts().find((c) => c.id === id)
  }

  public getSecondsLeft(contract: Contract): number {
    return Math.max(0, contract.expiresTick - this.now)
  }

  /** Owned adults that would satisfy the contract, best match first (cheapest creature first). */
  public getCandidates(id: string): Array<Readonly<OwnedCreature>> {
    const contract = this.get(id)
    if (!contract) return []
    return this.roster
      .list()
      .filter((c) => matchesContract(contract, c))
      .sort((a, b) => creatureValue(a) - creatureValue(b))
  }

  /** Hand a creature over for a contract's reward. The creature leaves the roster. */
  public fulfil(contractId: string, creatureId: string): FulfilResult {
    const contract = this.get(contractId)
    if (!contract) return { ok: false, reason: 'That contract is gone' }
    const creature = this.roster.get(creatureId)
    if (!creature) return { ok: false, reason: 'Pick a creature' }
    if (creature.ageStage !== 'adult') return { ok: false, reason: 'Buyers want adults' }
    if (!matchesContract(contract, creature)) {
      return { ok: false, reason: 'That creature does not fit the request' }
    }

    this.roster.remove(creatureId)
    this.purse.addMoney(contract.reward, `Contract ${contract.id}`)
    this.slots[contract.slot] = null
    this.refillAt[contract.slot] = this.now + C.REPLACE_DELAY_TICKS
    this.notify()
    return { ok: true, reward: contract.reward, creatureName: creature.name, contract }
  }

  /** Call once per economy tick. */
  public tick(tick: number): void {
    this.now = tick
    let changed = false
    for (let slot = 0; slot < this.slots.length; slot++) {
      const contract = this.slots[slot]
      if (contract && tick >= contract.expiresTick) {
        this.slots[slot] = null
        this.refillAt[slot] = tick + C.REPLACE_DELAY_TICKS
        changed = true
      } else if (!contract && tick >= this.refillAt[slot]) {
        this.slots[slot] = generateContract(this.baseSeed, this.nextNumber++, slot, tick)
        changed = true
      }
    }
    if (changed) this.notify()
  }

  public onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  public serialize(): ContractSnapshot {
    return {
      version: 1,
      nextNumber: this.nextNumber,
      now: this.now,
      slots: this.slots.map((c) => (c ? structuredClone(c) : null)),
      refillAt: [...this.refillAt],
    }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<ContractSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.slots)) return false
    const num = (v: unknown, fallback: number) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback

    const slots: Array<Contract | null> = Array.from({ length: C.BOARD_SLOTS }, () => null)
    s.slots.slice(0, C.BOARD_SLOTS).forEach((raw, i) => {
      const c = raw as Partial<Contract> | null
      if (!c || typeof c.id !== 'string' || !Array.isArray(c.requirements)) return
      const reqs = c.requirements.filter(isRequirement)
      if (reqs.length === 0 || reqs.length !== c.requirements.length) return
      slots[i] = {
        id: c.id,
        slot: i,
        requirements: reqs,
        reward: Math.max(0, Math.round(num(c.reward, 0))),
        postedTick: num(c.postedTick, 0),
        expiresTick: num(c.expiresTick, 0),
      }
    })
    this.slots = slots
    this.refillAt = Array.from({ length: C.BOARD_SLOTS }, (_, i) =>
      num((s.refillAt as number[] | undefined)?.[i], 0)
    )
    this.nextNumber = Math.max(1, Math.floor(num(s.nextNumber, 1)))
    this.now = num(s.now, 0)
    this.notify()
    return true
  }
}

function isRequirement(r: unknown): r is Requirement {
  if (typeof r !== 'object' || r === null) return false
  const { kind, value } = r as { kind?: unknown; value?: unknown }
  if (kind === 'tier') return typeof value === 'number' && Number.isFinite(value)
  return (kind === 'archetype' || kind === 'size' || kind === 'part') && typeof value === 'string'
}
