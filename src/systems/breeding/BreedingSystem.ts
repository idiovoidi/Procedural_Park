/**
 * BreedingSystem
 * Pairs two adult creatures in a pen with a breeding den, waits for the egg to hatch, and
 * adds the hatchling to the roster (GDD section 6).
 *
 * Time is the economy clock's: a breeding started now hatches after a fixed number of sim
 * ticks, including ticks simulated while the game was closed. Offspring are made with the
 * existing `crossover`, deterministic for a given pair and job number, plus an occasional
 * small mutation. Parents keep a cooldown after a litter.
 */

import { GAME_CONFIG } from '@core/constants'
import { findPenFor } from '@systems/capture'
import {
  crossover,
  type Genome,
  generateSpeciesName,
  hashSeed,
  mutate,
} from '@systems/creatures/genome'
import { canAddOccupant, type PenGrid } from '@systems/park'
import type { OwnedCreature, Roster } from '@systems/roster'
import { breedingCost, checkPairing, type PairingContext, rarityLift } from './pairing'

const B = GAME_CONFIG.ECONOMY.BREEDING

/** The part of the wallet breeding needs. */
export interface BreedingWallet {
  canAfford(amount: number): boolean
  removeMoney(amount: number, reason?: string): boolean
}

export interface BreedingJob {
  id: number
  penId: string
  parentIds: [string, string]
  /** Parent genomes are kept so the egg still hatches if a parent is sold meanwhile. */
  parentGenomes: [Genome, Genome]
  parentNames: [string, string]
  startedTick: number
  /** Tick on which it hatches. */
  hatchTick: number
}

export interface HatchEvent {
  jobId: number
  child: Readonly<OwnedCreature>
  parentNames: [string, string]
  /** True if no creature of this species had been owned before. */
  isNewSpecies: boolean
  mutated: boolean
  /** The pen the hatchling went to, or null if no pen had room. */
  penId: string | null
}

export type StartResult =
  | { ok: true; job: BreedingJob; cost: number }
  | { ok: false; reason: string }

export interface BreedingSnapshot {
  version: 1
  nextJobId: number
  jobs: BreedingJob[]
  cooldowns: Record<string, number>
  knownSpecies: number[]
}

type HatchListener = (event: HatchEvent) => void

export class BreedingSystem {
  private readonly roster: Roster
  private readonly grid: PenGrid
  private readonly wallet: BreedingWallet
  private readonly baseSeed: number
  private jobs: BreedingJob[] = []
  private nextJobId = 1
  private cooldowns = new Map<string, number>()
  private knownSpecies = new Set<number>()
  private now = 0
  private listeners = new Set<HatchListener>()

  constructor(roster: Roster, grid: PenGrid, wallet: BreedingWallet, baseSeed: number) {
    this.roster = roster
    this.grid = grid
    this.wallet = wallet
    this.baseSeed = baseSeed

    for (const c of roster.list()) this.knownSpecies.add(c.genome.speciesId)
    roster.onChange((change) => {
      if (change.reason === 'added') this.knownSpecies.add(change.creature.genome.speciesId)
    })
  }

  // ---- Rules ---------------------------------------------------------------------------------

  private context(): PairingContext {
    return {
      tick: this.now,
      readyTick: (id) => this.cooldowns.get(id) ?? 0,
      isBusy: (id) => this.jobs.some((j) => j.parentIds.includes(id)),
    }
  }

  /** Dens in a pen: how many there are, how many are in use. */
  public getDenStatus(penId: string): { dens: number; busy: number; free: number } {
    const dens = this.grid.getPen(penId)?.props.den ?? 0
    const busy = this.jobs.filter((j) => j.penId === penId).length
    return { dens, busy, free: Math.max(0, dens - busy) }
  }

  /** Pens that have at least one den, in grid order. */
  public getDenPens(): string[] {
    return this.grid
      .getPens()
      .filter((p) => p.props.den > 0)
      .map((p) => p.id)
  }

  /** Reasons the pair can't breed in this pen right now. Empty means they can. */
  public check(penId: string, aId: string, bId: string): string[] {
    const pen = this.grid.getPen(penId)
    if (!pen) return ['That pen is not closed']
    if (pen.props.den === 0) return ['This pen has no breeding den']
    if (this.getDenStatus(penId).free === 0) return ['Every den here is busy']

    const a = this.roster.get(aId)
    const b = this.roster.get(bId)
    if (!a || !b) return ['Pick two creatures']
    if (a.penId !== penId || b.penId !== penId) return ['Both parents must live in this pen']

    const problems = checkPairing(a, b, this.context())
    const cost = breedingCost(a.genome, b.genome)
    if (!this.wallet.canAfford(cost)) problems.push(`Breeding costs ${cost} coins`)
    return problems
  }

  public getCost(aId: string, bId: string): number | null {
    const a = this.roster.get(aId)
    const b = this.roster.get(bId)
    return a && b ? breedingCost(a.genome, b.genome) : null
  }

  // ---- Jobs ----------------------------------------------------------------------------------

  public start(penId: string, aId: string, bId: string): StartResult {
    const problems = this.check(penId, aId, bId)
    if (problems.length > 0) return { ok: false, reason: problems[0] }

    const a = this.roster.get(aId) as OwnedCreature
    const b = this.roster.get(bId) as OwnedCreature
    const cost = breedingCost(a.genome, b.genome)
    if (!this.wallet.removeMoney(cost, 'Breeding')) return { ok: false, reason: 'Not enough coins' }

    const job: BreedingJob = {
      id: this.nextJobId++,
      penId,
      parentIds: [aId, bId],
      parentGenomes: [structuredClone(a.genome), structuredClone(b.genome)],
      parentNames: [a.name, b.name],
      startedTick: this.now,
      hatchTick: this.now + B.GESTATION_TICKS,
    }
    this.jobs.push(job)
    return { ok: true, job, cost }
  }

  public getJobs(): readonly BreedingJob[] {
    return this.jobs
  }

  /** 0..1 progress of a job at the current tick. */
  public getProgress(job: BreedingJob): number {
    const span = job.hatchTick - job.startedTick
    return span <= 0 ? 1 : Math.min(1, Math.max(0, (this.now - job.startedTick) / span))
  }

  public getSecondsLeft(job: BreedingJob): number {
    return Math.max(0, (job.hatchTick - this.now) * GAME_CONFIG.ECONOMY.TICK_SECONDS)
  }

  /** Ticks until a creature may breed again (0 if it can). */
  public getCooldownTicks(creatureId: string): number {
    return Math.max(0, (this.cooldowns.get(creatureId) ?? 0) - this.now)
  }

  // ---- Hatching ----------------------------------------------------------------------------------

  /** Call once per economy tick. Hatches every egg that is due. */
  public tick(tick: number): HatchEvent[] {
    this.now = tick
    if (this.jobs.length === 0) return []

    const due = this.jobs.filter((j) => j.hatchTick <= tick)
    if (due.length === 0) return []
    this.jobs = this.jobs.filter((j) => j.hatchTick > tick)

    const events: HatchEvent[] = []
    for (const job of due) {
      const event = this.hatch(job)
      events.push(event)
      for (const listener of this.listeners) listener(event)
    }
    return events
  }

  private hatch(job: BreedingJob): HatchEvent {
    const [pa, pb] = job.parentGenomes
    const seed = hashSeed(this.baseSeed, job.id)

    let child = crossover(pa, pb, seed, rarityLift(pa, pb))
    let mutated = false
    const rolled = (hashSeed(seed, 0x6d7574) % 10_000) / 10_000
    if (rolled < B.MUTATION_CHANCE) {
      child = mutate(child, B.MUTATION_RATE, hashSeed(seed, 0x6d7532))
      mutated = true
    }

    const isNewSpecies = !this.knownSpecies.has(child.speciesId)

    // Born in the den's pen if there is room and everyone gets along, else anywhere that fits.
    const pen = this.grid.getPen(job.penId)
    const residents = this.roster.getByPen(job.penId).map((c) => ({ id: c.id, genome: c.genome }))
    let penId: string | null = null
    if (pen && canAddOccupant(pen, residents, child).ok) penId = job.penId
    else penId = findPenFor(this.grid, this.roster, child)

    const baby = this.roster.add(child, {
      parentIds: job.parentIds,
      ageStage: 'hatchling',
      penId,
      acquiredTick: this.now,
      stats: B.NEWBORN_STATS,
    })

    // Parents rest before the next litter (whether or not they are still owned).
    for (const id of job.parentIds) this.cooldowns.set(id, this.now + B.COOLDOWN_TICKS)

    return {
      jobId: job.id,
      child: baby,
      parentNames: job.parentNames,
      isNewSpecies,
      mutated,
      penId,
    }
  }

  /** Be told whenever an egg hatches. */
  public onHatch(listener: HatchListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ---- Species ------------------------------------------------------------------------------------

  public isKnownSpecies(speciesId: number): boolean {
    return this.knownSpecies.has(speciesId)
  }

  public getKnownSpecies(): number[] {
    return [...this.knownSpecies]
  }

  /** A name for a creature's species, for the codex and "new species!" messages. */
  public speciesNameOf(genome: Genome): string {
    return generateSpeciesName(genome)
  }

  // ---- Save / load ---------------------------------------------------------------------------------

  public serialize(): BreedingSnapshot {
    return {
      version: 1,
      nextJobId: this.nextJobId,
      jobs: structuredClone(this.jobs),
      cooldowns: Object.fromEntries(this.cooldowns),
      knownSpecies: [...this.knownSpecies],
    }
  }

  /** Restore from a save; bad entries are skipped. Returns false if the data is unusable. */
  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<BreedingSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.jobs)) return false

    const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0
    const isTick = (v: unknown): v is number =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0

    this.jobs = []
    for (const raw of s.jobs) {
      const j = raw as Partial<BreedingJob> | null
      if (
        !j ||
        !Number.isInteger(j.id) ||
        !isId(j.penId) ||
        !Array.isArray(j.parentIds) ||
        j.parentIds.length !== 2 ||
        !j.parentIds.every(isId) ||
        !Array.isArray(j.parentGenomes) ||
        j.parentGenomes.length !== 2 ||
        !Array.isArray(j.parentNames) ||
        !isTick(j.startedTick) ||
        !isTick(j.hatchTick)
      ) {
        continue
      }
      this.jobs.push({
        id: j.id as number,
        penId: j.penId,
        parentIds: [j.parentIds[0], j.parentIds[1]],
        parentGenomes: [j.parentGenomes[0], j.parentGenomes[1]] as [Genome, Genome],
        parentNames: [String(j.parentNames[0]), String(j.parentNames[1])],
        startedTick: j.startedTick,
        hatchTick: j.hatchTick,
      })
    }

    this.cooldowns = new Map()
    if (s.cooldowns && typeof s.cooldowns === 'object') {
      for (const [id, tick] of Object.entries(s.cooldowns)) {
        if (isTick(tick)) this.cooldowns.set(id, tick)
      }
    }

    this.knownSpecies = new Set(this.roster.list().map((c) => c.genome.speciesId))
    if (Array.isArray(s.knownSpecies)) {
      for (const id of s.knownSpecies) if (typeof id === 'number') this.knownSpecies.add(id)
    }

    const maxId = this.jobs.reduce((m, j) => Math.max(m, j.id), 0)
    this.nextJobId = Math.max(
      Number.isInteger(s.nextJobId) ? (s.nextJobId as number) : 1,
      maxId + 1
    )
    return true
  }

  /** Align the system's notion of "now" with the clock after a restore. */
  public syncTick(tick: number): void {
    this.now = tick
  }
}
