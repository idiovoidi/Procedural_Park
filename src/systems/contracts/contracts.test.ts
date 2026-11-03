import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { generateGenome } from '../creatures/genome'
import { Roster } from '../roster'
import {
  type Contract,
  ContractBoard,
  describeContract,
  generateContract,
  matchesContract,
} from './index'

const C = GAME_CONFIG.ECONOMY.CONTRACTS

function setup(seed = 7) {
  const roster = new Roster()
  const paid: Array<[number, string]> = []
  const board = new ContractBoard(roster, { addMoney: (n, r) => paid.push([n, r ?? '']) }, seed)
  board.tick(0)
  return { roster, board, paid }
}

/** An owned adult built to satisfy a contract: the template the contract came from. */
function matchFor(contract: Contract, seed: number) {
  // Search seeds until a genome meets every requirement (the generator guarantees one exists).
  for (let s = 1; s < 200_000; s++) {
    const g = generateGenome(s + seed)
    if (matchesContract(contract, { genome: g, ageStage: 'adult' })) return g
  }
  throw new Error('no match found')
}

describe('contract generation', () => {
  it('is deterministic and satisfiable by construction', () => {
    for (let n = 1; n <= 30; n++) {
      const a = generateContract(99, n, n % 4, 0)
      const b = generateContract(99, n, n % 4, 0)
      expect(a).toEqual(b)
      expect(a.requirements.length).toBeGreaterThan(0)
      expect(a.reward).toBeGreaterThan(0)
    }
  })

  it('asks for more as the slot number rises', () => {
    const counts = [0, 1, 2, 3].map((slot) => {
      let total = 0
      for (let n = 1; n <= 40; n++) total += generateContract(5, n, slot, 0).requirements.length
      return total / 40
    })
    expect(counts[0]).toBeLessThan(counts[3])
  })

  it('describes requirements in plain words', () => {
    const text = describeContract(generateContract(1, 1, 3, 0))
    expect(text.length).toBeGreaterThan(3)
  })
})

describe('contract board', () => {
  it('fills every slot on the first tick', () => {
    const { board } = setup()
    expect(board.getContracts()).toHaveLength(C.BOARD_SLOTS)
    expect(new Set(board.getContracts().map((c) => c.id)).size).toBe(C.BOARD_SLOTS)
  })

  it('replaces a contract when it expires', () => {
    const { board } = setup()
    const first = board.getContracts()[0]
    board.tick(first.expiresTick)
    expect(board.get(first.id)).toBeUndefined()
    board.tick(first.expiresTick + C.REPLACE_DELAY_TICKS)
    expect(board.getContracts()).toHaveLength(C.BOARD_SLOTS)
  })

  it('pays and removes the creature when fulfilled, then posts a new contract', () => {
    const { board, roster, paid } = setup()
    const contract = board.getContracts()[0]
    const owned = roster.add(matchFor(contract, 0), { ageStage: 'adult' })

    expect(board.getCandidates(contract.id).map((c) => c.id)).toContain(owned.id)
    const result = board.fulfil(contract.id, owned.id)
    expect(result.ok).toBe(true)
    expect(paid).toEqual([[contract.reward, `Contract ${contract.id}`]])
    expect(roster.has(owned.id)).toBe(false)
    expect(board.get(contract.id)).toBeUndefined()

    board.tick(C.REPLACE_DELAY_TICKS)
    expect(board.getContracts()).toHaveLength(C.BOARD_SLOTS)
  })

  it('refuses a creature that does not fit, a juvenile, or an unknown contract', () => {
    const { board, roster, paid } = setup()
    const contract = board.getContracts()[0]
    const good = matchFor(contract, 0)
    const young = roster.add(good, { ageStage: 'juvenile' })
    expect(board.fulfil(contract.id, young.id).ok).toBe(false)

    let wrong = generateGenome(1)
    for (let s = 1; matchesContract(contract, { genome: wrong, ageStage: 'adult' }); s++) {
      wrong = generateGenome(s)
    }
    const other = roster.add(wrong)
    expect(board.fulfil(contract.id, other.id).ok).toBe(false)
    expect(board.fulfil('nope', other.id).ok).toBe(false)
    expect(paid).toEqual([])
    expect(roster.has(other.id)).toBe(true)
  })

  it('round-trips through save and restore, and tolerates bad data', () => {
    const { board } = setup()
    board.tick(500)
    const snap = board.serialize()
    const { board: other } = setup(7)
    expect(other.restore(JSON.parse(JSON.stringify(snap)))).toBe(true)
    expect(other.getContracts()).toEqual(board.getContracts())

    expect(other.restore(null)).toBe(false)
    expect(other.restore({ version: 9 })).toBe(false)
    const junk = {
      version: 1,
      nextNumber: 'x',
      now: -4,
      slots: [{ id: 5 }, null, { id: 'a', requirements: [{ kind: 'zzz', value: 1 }] }],
    }
    expect(other.restore(junk)).toBe(true)
    expect(other.getContracts()).toEqual([])
    other.tick(0)
    expect(other.getContracts()).toHaveLength(C.BOARD_SLOTS)
  })

  it('does not repeat contract ids after a restore', () => {
    const { board } = setup()
    const ids = board.getContracts().map((c) => c.id)
    const { board: other } = setup(7)
    other.restore(board.serialize())
    board.tick(10_000)
    other.tick(10_000)
    expect(other.getContracts().map((c) => c.id)).toEqual(board.getContracts().map((c) => c.id))
    expect(
      ids.some((id) =>
        other
          .getContracts()
          .map((c) => c.id)
          .includes(id)
      )
    ).toBe(false)
  })
})
