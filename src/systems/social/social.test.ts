import { describe, expect, it } from 'vitest'
import { Codex } from '../codex'
import { generateGenome } from '../creatures/genome'
import { Roster } from '../roster'
import { CodexShare } from './CodexShare'
import { CHUNK_CHARS, MAX_MESSAGE_CHARS, SocialChannel } from './channel'
import {
  type JointBeginArgs,
  JointBreeding,
  type JointEvent,
  MAX_INCOMING_JOINT,
} from './JointBreeding'
import { MAX_INCOMING, type TradeEvent, TradeManager } from './TradeManager'
import { VisitShare } from './VisitShare'

/** Two channels wired back to back. `drop` lets a test lose frames in transit. */
function link() {
  const sent: string[] = []
  let a!: SocialChannel
  let b!: SocialChannel
  const wire = { drop: (_text: string): boolean => false }
  a = new SocialChannel((t) => {
    if (!wire.drop(t)) b.receive(t)
  })
  b = new SocialChannel((t) => {
    sent.push(t)
    if (!wire.drop(t)) a.receive(t)
  })
  return { a, b, wire, sent }
}

describe('SocialChannel', () => {
  it('delivers a message to the handler for its type', () => {
    const { a, b } = link()
    const got: unknown[] = []
    b.on('hello', (m) => got.push(m))
    a.send({ type: 'hello', n: 1 })
    a.send({ type: 'other' })
    expect(got).toEqual([{ type: 'hello', n: 1 }])
  })

  it('splits a big message into chunks and puts it back together', () => {
    const { a, b } = link()
    const frames: string[] = []
    const spy = new SocialChannel((t) => {
      frames.push(t)
      b.receive(t)
    })
    const big = 'x'.repeat(CHUNK_CHARS * 3 + 17)
    let got: unknown = null
    b.on('big', (m) => {
      got = m
    })
    spy.send({ type: 'big', data: big })
    expect(frames.length).toBeGreaterThan(3)
    expect(frames.every((f) => f.length < 16_000)).toBe(true)
    expect((got as { data: string }).data).toBe(big)
    void a
  })

  it('reassembles chunks that arrive out of order, and ignores duplicates', () => {
    const frames: string[] = []
    const out = new SocialChannel((t) => frames.push(t))
    out.send({ type: 'm', data: 'y'.repeat(CHUNK_CHARS * 2) })
    const inn = new SocialChannel(() => {})
    let count = 0
    inn.on('m', () => count++)
    for (const f of [frames[2], frames[0], frames[0], frames[1]]) inn.receive(f)
    expect(count).toBe(1)
  })

  it('ignores junk, inconsistent chunks and oversized claims without throwing', () => {
    const inn = new SocialChannel(() => {})
    let count = 0
    inn.on('x', () => count++)
    for (const junk of [
      'not json',
      '{}',
      '{"m":1,"i":0,"n":1,"d":"not json either"}',
      '{"m":1,"i":5,"n":2,"d":"x"}',
      `{"m":2,"i":0,"n":${MAX_MESSAGE_CHARS},"d":"x"}`,
      '{"m":3,"i":0,"n":1,"d":"{\\"no\\":\\"type\\"}"}',
    ]) {
      expect(() => inn.receive(junk)).not.toThrow()
    }
    expect(count).toBe(0)
  })

  it('refuses to send something absurdly large', () => {
    const out = new SocialChannel(() => {})
    expect(() => out.send({ type: 'x', d: 'z'.repeat(MAX_MESSAGE_CHARS + 1) })).toThrow()
  })
})

function pair() {
  const { a, b } = link()
  const rosterA = new Roster()
  const rosterB = new Roster()
  let ids = 0
  const tradeA = new TradeManager(rosterA, a, { makeId: () => `a${++ids}` })
  const tradeB = new TradeManager(rosterB, b, { makeId: () => `b${++ids}` })
  const eventsA: TradeEvent[] = []
  const eventsB: TradeEvent[] = []
  tradeA.onEvent((e) => eventsA.push(e))
  tradeB.onEvent((e) => eventsB.push(e))
  return { rosterA, rosterB, tradeA, tradeB, eventsA, eventsB }
}

describe('trading', () => {
  it('moves a creature to the friend once they accept, and not before', () => {
    const { rosterA, rosterB, tradeA, tradeB, eventsA, eventsB } = pair()
    const mine = rosterA.add(generateGenome(5), { name: 'Pebble' })

    const result = tradeA.offer(mine.id)
    expect(result.ok).toBe(true)
    // Offered, but nothing has moved yet.
    expect(rosterA.has(mine.id)).toBe(true)
    expect(rosterB.count()).toBe(0)
    const [incoming] = tradeB.getIncoming()
    expect(incoming.offer.name).toBe('Pebble')
    expect(eventsB[0].kind).toBe('offered')

    tradeB.accept(incoming.offer.id)
    expect(rosterA.has(mine.id)).toBe(false)
    expect(rosterB.count()).toBe(1)
    const got = rosterB.list()[0]
    expect(got.name).toBe('Pebble')
    expect(got.genome).toEqual(mine.genome)
    expect(eventsA.map((e) => e.kind)).toEqual(['sent'])
    expect(eventsB.map((e) => e.kind)).toEqual(['offered', 'received'])
    expect(tradeA.getOutgoing()).toEqual([])
    expect(tradeB.getIncoming()).toEqual([])
  })

  it('a swap is two offers, one each way', () => {
    const { rosterA, rosterB, tradeA, tradeB } = pair()
    const a1 = rosterA.add(generateGenome(1), { name: 'A1' })
    const b1 = rosterB.add(generateGenome(2), { name: 'B1' })
    tradeA.offer(a1.id)
    tradeB.offer(b1.id)
    tradeB.accept(tradeB.getIncoming()[0].offer.id)
    tradeA.accept(tradeA.getIncoming()[0].offer.id)
    expect(rosterA.list().map((c) => c.name)).toEqual(['B1'])
    expect(rosterB.list().map((c) => c.name)).toEqual(['A1'])
  })

  it('a declined or cancelled offer keeps the creature', () => {
    const { rosterA, tradeA, tradeB, eventsA, eventsB } = pair()
    const c = rosterA.add(generateGenome(3), { name: 'Moss' })
    tradeA.offer(c.id)
    tradeB.decline(tradeB.getIncoming()[0].offer.id)
    expect(rosterA.has(c.id)).toBe(true)
    expect(eventsA.at(-1)?.kind).toBe('declined')

    const second = tradeA.offer(c.id)
    expect(second.ok).toBe(true)
    if (second.ok) tradeA.cancel(second.id)
    expect(tradeB.getIncoming()).toEqual([])
    expect(eventsB.at(-1)?.kind).toBe('cancelled')
    expect(rosterA.has(c.id)).toBe(true)
  })

  it('voids the trade if the creature is gone by the time it is accepted', () => {
    const { rosterA, rosterB, tradeA, tradeB, eventsA, eventsB } = pair()
    const c = rosterA.add(generateGenome(4), { name: 'Gone' })
    tradeA.offer(c.id)
    rosterA.remove(c.id) // sold in the meantime
    tradeB.accept(tradeB.getIncoming()[0].offer.id)
    expect(rosterB.count()).toBe(0)
    expect(eventsA.at(-1)?.kind).toBe('voided')
    expect(eventsB.at(-1)?.kind).toBe('voided')
  })

  it('never duplicates: a creature that is busy cannot be offered, or handed over', () => {
    const { b, a } = link()
    const roster = new Roster()
    const locked = new Set<string>()
    const trade = new TradeManager(roster, a, {
      isLocked: (id) => locked.has(id),
      makeId: () => 't1',
    })
    const friend = new TradeManager(new Roster(), b)
    const c = roster.add(generateGenome(6), { name: 'Busy' })

    locked.add(c.id)
    expect(trade.offer(c.id).ok).toBe(false)
    locked.delete(c.id)
    expect(trade.offer(c.id).ok).toBe(true)
    expect(trade.offer(c.id).ok).toBe(false) // already offered
    locked.add(c.id) // starts breeding before the friend answers
    friend.accept(friend.getIncoming()[0].offer.id)
    expect(roster.has(c.id)).toBe(true)
  })

  it('only completes a trade the receiver accepted', () => {
    const { b } = link()
    const rosterB = new Roster()
    const tradeB = new TradeManager(rosterB, b)
    const g = generateGenome(7)
    b.receive(
      JSON.stringify({
        m: 1,
        i: 0,
        n: 1,
        d: JSON.stringify({
          type: 'trade.offer',
          id: 'x',
          name: 'Sneak',
          genome: g,
          generation: 0,
          ageStage: 'adult',
        }),
      })
    )
    expect(tradeB.getIncoming()).toHaveLength(1)
    // A forged confirmation without acceptance adds nothing.
    b.receive(
      JSON.stringify({ m: 2, i: 0, n: 1, d: JSON.stringify({ type: 'trade.confirm', id: 'x' }) })
    )
    expect(rosterB.count()).toBe(0)
  })

  it('rejects offers with an invalid genome, name or stage, and floods', () => {
    const { b } = link()
    const tradeB = new TradeManager(new Roster(), b)
    const offer = (extra: Record<string, unknown>) =>
      b.receive(
        JSON.stringify({
          m: Math.floor(Math.random() * 1e9),
          i: 0,
          n: 1,
          d: JSON.stringify({
            type: 'trade.offer',
            id: String(Math.random()),
            name: 'N',
            genome: generateGenome(8),
            generation: 1,
            ageStage: 'adult',
            ...extra,
          }),
        })
      )
    offer({ genome: { archetype: 'dragon' } })
    offer({ genome: null })
    offer({ name: '   ' })
    offer({ ageStage: 'elder' })
    expect(tradeB.getIncoming()).toHaveLength(0)

    offer({ generation: 1e9 })
    expect(tradeB.getIncoming()[0].offer.generation).toBe(99)

    for (let i = 0; i < MAX_INCOMING + 3; i++) offer({})
    expect(tradeB.getIncoming()).toHaveLength(MAX_INCOMING)
  })

  it('forgets pending trades on disconnect without moving anything', () => {
    const { rosterA, tradeA, tradeB } = pair()
    const c = rosterA.add(generateGenome(9))
    tradeA.offer(c.id)
    tradeA.reset()
    tradeB.reset()
    expect(tradeA.getOutgoing()).toEqual([])
    expect(tradeB.getIncoming()).toEqual([])
    expect(rosterA.has(c.id)).toBe(true)
  })
})

describe('shared codex', () => {
  const seen = (codex: Codex) => codex.list().map((e) => e.speciesId)

  function codexPair() {
    const { a, b } = link()
    const codexA = new Codex()
    const codexB = new Codex()
    const shareA = new CodexShare(codexA, a)
    const shareB = new CodexShare(codexB, b)
    return { codexA, codexB, shareA, shareB }
  }

  it('logs for the friend every species a player found, without studying it', () => {
    const { codexA, codexB, shareA } = codexPair()
    const g1 = generateGenome(11)
    const g2 = generateGenome(12)
    codexA.recordPhoto(g1)
    codexA.recordOwned({ name: 'Own', genome: g2, parentIds: null })
    shareA.sendAll()

    expect(seen(codexB).sort()).toEqual([g1.speciesId, g2.speciesId].sort())
    const entry = codexB.get(g1.speciesId)
    expect(entry?.foundBy).toBe('shared')
    expect(entry?.owned).toBe(false)
    expect(entry?.studied).toBe(false)
  })

  it('sends a fresh discovery as it happens, and tells the listener how many were new', () => {
    const { codexA, codexB, shareA, shareB } = codexPair()
    const learned: number[] = []
    shareB.onLearned((n) => learned.push(n))
    const g = generateGenome(13)
    codexA.onChange((entry, isNew) => {
      if (isNew) shareA.sendEntry(entry)
    })
    codexA.recordPhoto(g)
    expect(codexB.get(g.speciesId)).toBeDefined()
    expect(learned).toEqual([1])
    // Sending again adds nothing new.
    shareA.sendAll()
    expect(learned).toEqual([1])
  })

  it('does not echo what it learned back to the friend, or overwrite what is known', () => {
    const { codexA, codexB, shareA, shareB } = codexPair()
    const g = generateGenome(14)
    codexA.recordPhoto(g)
    shareA.sendAll()
    const before = codexA.list().length
    shareB.sendAll() // B only knows it by sharing: nothing to send back
    expect(codexA.list().length).toBe(before)

    // A species B owns stays owned when A shares it.
    const own = generateGenome(15)
    codexB.recordOwned({ name: 'Mine', genome: own, parentIds: null })
    codexA.recordPhoto(own)
    shareA.sendAll()
    expect(codexB.get(own.speciesId)?.owned).toBe(true)
    expect(codexB.get(own.speciesId)?.foundBy).toBe('captured')
  })

  it('ignores invalid genomes and survives a save round trip', () => {
    const { codexB } = codexPair()
    const { a, b } = link()
    const share = new CodexShare(codexB, b)
    void share
    a.send({ type: 'codex.share', genomes: [null, 5, { archetype: 'dragon' }, generateGenome(16)] })
    expect(codexB.count()).toBe(1)

    const restored = new Codex()
    expect(restored.restore(JSON.parse(JSON.stringify(codexB.serialize())))).toBe(true)
    expect(restored.list()[0].foundBy).toBe('shared')
  })
})

describe('visiting a friend', () => {
  function visitPair() {
    const { a, b } = link()
    const log: string[] = []
    let received: unknown = null
    const host = new VisitShare(b, {
      getSnapshot: () => ({ grid: { pens: 2 }, roster: { creatures: 3 } }),
      onVisitorArrived: () => log.push('arrived'),
      onVisitorLeft: () => log.push('left'),
      onSnapshot: () => {},
    })
    const guest = new VisitShare(a, {
      getSnapshot: () => ({ grid: null, roster: null }),
      onSnapshot: (s) => {
        received = s
      },
    })
    return { host, guest, log, got: () => received }
  }

  it('sends the host park to a guest who asked, and tells the host', () => {
    const { guest, log, got } = visitPair()
    guest.request()
    expect(guest.isWaiting()).toBe(false)
    expect(got()).toEqual({ grid: { pens: 2 }, roster: { creatures: 3 } })
    expect(log).toEqual(['arrived'])
    guest.leave()
    expect(log).toEqual(['arrived', 'left'])
  })

  it('ignores a park nobody asked for', () => {
    const { a, b } = link()
    let called = false
    const guest = new VisitShare(a, {
      getSnapshot: () => ({ grid: null, roster: null }),
      onSnapshot: () => {
        called = true
      },
    })
    void guest
    b.send({ type: 'visit.snapshot', grid: {}, roster: {} })
    expect(called).toBe(false)
  })

  it('a big park still arrives whole', () => {
    const { a, b } = link()
    const big = { creatures: Array.from({ length: 200 }, (_, i) => ({ i, pad: 'p'.repeat(2000) })) }
    let got: unknown = null
    new VisitShare(b, { getSnapshot: () => ({ grid: {}, roster: big }), onSnapshot: () => {} })
    const guest = new VisitShare(a, {
      getSnapshot: () => ({ grid: null, roster: null }),
      onSnapshot: (s) => {
        got = s
      },
    })
    guest.request()
    expect((got as { roster: typeof big }).roster.creatures).toHaveLength(200)
  })
})

describe('joint breeding protocol', () => {
  function jointLink(failB = false) {
    const { a, b } = link()
    const rosterA = new Roster()
    const rosterB = new Roster()
    const beginsA: JointBeginArgs[] = []
    const beginsB: JointBeginArgs[] = []
    const ja = new JointBreeding(
      rosterA,
      a,
      (args) => {
        beginsA.push(args)
        return { ok: true }
      },
      () => 'j1'
    )
    const jb = new JointBreeding(rosterB, b, (args) => {
      beginsB.push(args)
      return failB ? { ok: false, reason: 'no den' } : { ok: true }
    })
    const eventsA: JointEvent[] = []
    const eventsB: JointEvent[] = []
    ja.onEvent((e) => eventsA.push(e))
    jb.onEvent((e) => eventsB.push(e))
    return { ja, jb, rosterA, rosterB, beginsA, beginsB, eventsA, eventsB }
  }

  it('both sides start an egg with the other’s parent once the friend accepts', () => {
    const { ja, jb, rosterA, rosterB, beginsA, beginsB } = jointLink()
    const mine = rosterA.add(generateGenome(21), { name: 'Mine' })
    const theirs = rosterB.add(generateGenome(22), { name: 'Theirs' })

    expect(ja.propose(mine.id).ok).toBe(true)
    expect(beginsA).toEqual([]) // nothing until accepted
    const [proposal] = jb.getIncoming()
    expect(proposal.name).toBe('Mine')

    expect(jb.accept(proposal.id, theirs.id).ok).toBe(true)
    expect(beginsB).toHaveLength(1)
    expect(beginsB[0]).toMatchObject({ jointId: 'j1', myParentId: theirs.id, iProposed: false })
    expect(beginsB[0].friendGenome).toEqual(mine.genome)
    expect(beginsA).toHaveLength(1)
    expect(beginsA[0]).toMatchObject({ jointId: 'j1', myParentId: mine.id, iProposed: true })
    expect(beginsA[0].friendGenome).toEqual(theirs.genome)
    // Both keep their parents.
    expect(rosterA.has(mine.id) && rosterB.has(theirs.id)).toBe(true)
  })

  it('does not tell the friend yes if I cannot start my own egg', () => {
    const { ja, jb, rosterA, rosterB, beginsA } = jointLink(true)
    const mine = rosterA.add(generateGenome(23))
    const theirs = rosterB.add(generateGenome(24))
    ja.propose(mine.id)
    const result = jb.accept(jb.getIncoming()[0].id, theirs.id)
    expect(result).toEqual({ ok: false, reason: 'no den' })
    expect(beginsA).toEqual([])
    expect(jb.getIncoming()).toHaveLength(1) // still open to try again
  })

  it('handles decline, cancel, duplicates, floods and junk', () => {
    const { ja, jb, rosterA, eventsA, eventsB } = jointLink()
    const c = rosterA.add(generateGenome(25))
    ja.propose(c.id)
    expect(ja.propose(c.id).ok).toBe(false) // already offered
    jb.decline(jb.getIncoming()[0].id)
    expect(eventsA.at(-1)?.kind).toBe('declined')

    const again = ja.propose(c.id)
    if (again.ok) ja.cancel(again.id)
    expect(eventsB.at(-1)?.kind).toBe('cancelled')

    const { b } = link()
    const jx = new JointBreeding(new Roster(), b, () => ({ ok: true }))
    const send = (extra: Record<string, unknown>) =>
      b.receive(
        JSON.stringify({
          m: Math.floor(Math.random() * 1e9),
          i: 0,
          n: 1,
          d: JSON.stringify({
            type: 'joint.propose',
            id: String(Math.random()),
            name: 'N',
            genome: generateGenome(26),
            ...extra,
          }),
        })
      )
    send({ genome: { archetype: 'dragon' } })
    send({ name: '' })
    send({ id: '' })
    expect(jx.getIncoming()).toHaveLength(0)
    for (let i = 0; i < MAX_INCOMING_JOINT + 2; i++) send({})
    expect(jx.getIncoming()).toHaveLength(MAX_INCOMING_JOINT)
  })

  it('ignores an accept for a proposal that was never made', () => {
    const { b } = link()
    let began = false
    new JointBreeding(new Roster(), b, () => {
      began = true
      return { ok: true }
    })
    b.receive(
      JSON.stringify({
        m: 1,
        i: 0,
        n: 1,
        d: JSON.stringify({
          type: 'joint.accept',
          id: 'nope',
          name: 'X',
          genome: generateGenome(27),
        }),
      })
    )
    expect(began).toBe(false)
  })
})
