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
