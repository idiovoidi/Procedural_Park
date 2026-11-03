# Economy balance

A bot (`src/systems/balance/bot.ts`) plays the real systems (no WebGL) for simulated hours and
`balance.test.ts` guards the shape of the curve. Run the printed report with `npm run balance`;
explore market settings with `BALANCE_SWEEP=1 npx vitest run src/systems/balance/sweep.test.ts`.

## Findings (T17)

1. **Starting-coins trap.** A pen (~93) plus a crate (25) cost more than the 100 starting coins.
   Feeding rewards from the first capture attempts bridge the gap; the opening test guards it.
2. **Original market broke even.** Linear demand recovery (3 units/min) made food cost about equal
   to sales. Recovery is now proportional (`DEMAND_RECOVERY_RATE`), drop per unit sold is
   `DEMAND_DROP_PER_UNIT`.
3. **Per-archetype prices were uneven** (crystalline lost money). Base prices now give every
   archetype about 1.85-1.9x its food cost at full demand.
4. **A single legendary dominated** (x7 output). Rarity `outputMultiplier` is now 1 / 1.3 / 1.7 / 2.3 / 3.
5. **Healthy region:** `drop / rate` <= ~0.7; at >= ~1.5 the market stalls. Chosen 0.005 / 0.008.
   The sweep is noisy (bot decisions shift), but every cell with ratio <= 0.8 grows.
6. **No runaway:** growth is roughly linear, 0% starvation, ~1% waste.
7. **Sink shortage:** water, ground painting, land and automation are not buildable yet, so coins
   pile up late. Expected until M2.

## Breeding economics

Offspring rarity used to be the parents' average (+-0.05), so breeding could never beat the best
parent and a breeding bot ended *behind* a non-breeding one (~93k vs ~122k net worth @240 min).

**Rarity ratchet (decided with the owner, with contracts to follow):** when both parents are at
least `BREEDING.RARITY_LIFT_MIN_PARENT` (0.3), the child gets `BREEDING.RARITY_LIFT` (+0.03) on top
of the average. In the sim, bred creatures average ~0.88 rarity vs ~0.77 for founders, reaching
generation 5 (guarded by a test). The bot still nets less than a non-breeding bot (~100k vs ~122k)
because it captured a near-max legendary early, so there is no headroom to climb; den fees and
extra mouths are not repaid. The payoff for breeding must therefore also come from
**contracts that pay for specific traits (M2, T19)**, planned next.

## Contracts (T19a)

The Contract Board posts four seeded requests (archetype, size, minimum rarity tier, optional
parts) built from a real template creature, so each is satisfiable. A contract pays the template's
market value x `CONTRACTS.REWARD_SCALE` x (1.15 + 0.35 per requirement).

`REWARD_SCALE` is 8 because a creature is worth far more as a producer than at market: at scale 1-3
a bot that gave up a producer to deliver a contract ended *behind* a plain production bot. Sweep
(net worth @240 min; the bot delivers everything except its two rarest adults; a plain production
bot reaches ~122k):

| scale | contracts + breeding | contracts, no breeding |
|---|---|---|
| 1 | 94k | 65k |
| 3 | 109k | 73k |
| 6 | 132k | 85k |
| 10 | 162k | 100k |

At 8 the breeding line beats plain production by ~20% without running away, and breeding on its
own (no contracts) is clearly the worse path, which is the point: contracts are the bridge between
breeding and income. A guard-rail test asserts both bounds (1.05x to 3x).

## Silos and the auto-sell valve (T19d)

Without a silo the player holds at most `INVENTORY_BASE_CAPACITY` (150) of each resource; each
silo adds `SILO_CAPACITY` (500) of every resource, park-wide. A bin that cannot unload into a full
inventory simply keeps its output, which is the soft pressure to build silos or to sell.

An auto-sell valve sells each resource every production cycle while its price is at or above the
player's floor (default 70% of base, adjustable 30-100% in the Market panel). A high floor waits
for good prices and fills the silos; a low floor sells everything immediately. The balance sim is
unchanged: its bot already sells every minute and never reaches the base cap.

## Food farms (T19e)

A farm (150 coins) grows 1.5 servings per feeding cycle of the cheap staple (berry or fish) its
pen's residents digest best; meat, crystal and energy stay store-bought. One farm roughly covers
one small creature (a berry serving costs 10, so a farm saves ~15 coins/min and pays back in about
10 minutes); a crowded pen needs several farms, each taking a cell, so food is a layout decision
and not a free lunch. The sim bot still buys food, so the guard-rail margins are unchanged;
T19f adds a hands-off bot that relies on farms, hoppers, collectors and valves.
