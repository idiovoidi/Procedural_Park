# Procedural Park — Task List

Derived from [`GDD.md`](./GDD.md) §15 (milestones). Update status here as work lands.
Legend: `[ ]` todo · `[~]` in progress · `[x]` done · **← deps** are tasks that must finish first.

## Start here (can begin now)

- [x] **T1 — Fix P2P host timeout and disconnect-as-error** *(M0 cleanup)*
  Added a 5-min `signalingTimeout` for the code exchange; the 30 s `connectionTimeout` starts when the answer is applied. Deliberate/remote close is no longer an error. Removed the `setTimeout` patch from the E2E spec and added unit tests plus an E2E no-console-errors check.
- [x] **T2 — Decide GDD open questions blocking M1** *(design)*
  Decided and recorded in GDD §17.1: output + sales + contracts; five archetype resources; fixed build zone that grows; timers/costs only for breeding; base prices with demand saturation; capped offline catch-up; range-based automation first. Still open: Q5 species identity (needed by T14), Q9, Q10, Q11.

## M1 — Vertical slice

Exit: a new player captures a founder, pens it, earns from it, breeds a child, sees it hatch and sells it in ~30 min; the economy neither stalls nor explodes in the balance sim.

| ID | Task | Deps | Done when |
|---|---|---|---|
| T3 | [x] Fixed-step economy tick + `GAME_CONFIG` economy constants | T2 ✅ | Deterministic in vitest, no WebGL |
| T4 | [x] Derive care/economic stats from the genome | T3 | Every archetype/size/temperament/locomotion covered by tests |
| T5 | [x] Roster + per-creature state (hunger, happiness, trust, age, lineage) | T4 | Stores full genomes; serialisable; tested |
| T6 | [x] Pen system: enclosure detection, habitat profile, quality score | T4 | Open vs closed pens, capacity, mixed temperaments tested |
| T7 | [x] Build mode MVP: ghost placement, snapping, fences, trough | T6 | Player builds a closed pen with a trough that the pen system recognises |
| T8 | [x] Care loop: hunger, happiness, trough + hand feeding | T5, T6 | Correct hunger/happiness trajectories; soft failure only |
| T9 | [x] Production + collection of per-archetype resources | T8 | Output formula matches GDD §7.5; storage cap respected |
| T10 | [x] Market: sell resources and creatures, pricing, UI | T9 | Coins update; pricing tested |
| T11 | [x] Capture loop: feeding/trust, lure, transport crate | T5 | Two founders captured by two methods land in the roster |
| T12 | [x] Hub park: resident creatures roaming inside pens | T5, T6 | 20+ residents at target fps, staying inside pens |
| T13 | [x] Breeding Den: pairing rules, timer, preview, hatching | T5, T12 | Deterministic, rules tested; breed + hatch works in game |
| T14 | [x] Codex and roster UI rework | T5 | No 10-creature cap; bred species recorded; card export round-trips |
| T15 | [x] Tool belt + HUD for the management loop | T7 | Every slice interaction reachable via the tool belt |
| T16 | [x] Versioned save/load for slice state + export/import | T5, T6, T9 | Save, reload, migration and offline catch-up tests pass |
| T17 | [x] Balance sim script + economy/breeding unit tests | T9, T10, T13 | Baseline shows no runaway or dead-end economy |
| T18 | [x] Slice E2E test + playtest tuning pass | T10, T11, T13–T17 | E2E green in CI; playtest notes recorded |

### Suggested order

`T2 → T3 → T4 → (T5 ∥ T6) → (T7 ∥ T8 ∥ T11 ∥ T12 ∥ T14) → T9 → T10 → T13 → (T15 ∥ T16 ∥ T17) → T18`

## M2 — Automation and contracts (T19 split)

Exit: a player can run a hands-off park for several minutes without starving creatures, and breeding has a reason to exist.

| ID | Task | Deps | Done when |
|---|---|---|---|
| T19a | [ ] Contract Board: seeded trait requests, fulfil with a creature, panel, save, balance | T18 | Contracts pay a premium over market, are always satisfiable, survive save/load |
| T19b | [x] Feeder hopper: per-pen hopper that tops up the trough | T19a | A fed pen runs for many cycles without the player |
| T19c | [x] Collector range + bin warning: auto-collect nearby bins, warn on bin-less pens | T19b | No output wasted in a pen with a bin |
| T19d | [x] Silos + auto-sell valve with price floor | T19c | Output sells itself above the floor price |
| T19e | [x] Food farms (generators) | T19d | Food no longer has to be bought |
| T19f | [ ] M2 balance sim + E2E | T19a–e | Balance guard rails and E2E cover the hands-off loop |

## Later milestones (split into tasks when reached)

| Epic | Milestone | Scope | Deps |
|---|---|---|---|
| T19 | M2 Automation | Feeders, bins, conveyors, silos, auto-sell, food farms, Contract Board (contracts must pay for traits so breeding earns; see BALANCE.md) | T18 |
| T20 | M3 Expeditions | Map manager, 2–3 maps, study/special-condition capture, night spawns | T19 |
| T21 | M4 Social | Card trading, friend park visit, shared codex, E2E coverage | T1, T18 |
| T22 | M5–M6 Depth + Arena | Pedigree, inbreeding, mutations, staff, joint breeding; deterministic auto-battler | T19, T21 |
| T23 | M7 Platform polish | Gamepad, mobile touch, performance scaling, accessibility (start spikes early if M1 shows perf issues) | — |
