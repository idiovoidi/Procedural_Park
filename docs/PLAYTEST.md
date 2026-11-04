# Playtest notes (M1 slice)

Recorded while writing the slice E2E test (`tests/e2e/slice.spec.ts`), which plays the loop in the
real game: build pen + trough + bin + den, house two creatures, run an hour, collect, sell, breed
and hatch, read the Ranch Book, reload.

## Found and fixed

- **Output could not be collected.** `ProductionSystem.collect` existed but nothing in the game
  called it, so a player's creatures filled bins that could never be emptied or sold. Added the
  **Collect** slot / `Q` key (looked-at pen, else every pen), and the pen inspector now shows
  `bin used/capacity`.
- **Cluttered bottom bar.** Key-hint strip duplicated the new tool belt; trimmed.

- **Troughs could not be stocked.** Nothing in the game moved food from the player's bag into a
  trough (only the balance bot did). Added the **Stock** slot (looked-at pen; troughs first, then
  feeder hoppers; only foods its residents eat well) and a **Shop** slot (`O`).

- **Silent waste.** The pen inspector now warns "no bin" and "bin nearly full"; an **Auto-collector** (80 coins) empties a pen's bin into the inventory every production cycle.

## Still open (candidates for the next pass)

- Nothing in the UI paints ground, adds water, or buys land (GDD §6): coins pile up late.
- Residents cannot be hand-fed or photographed; the trough is the only food path.
- Real mouse placement needs pointer lock, which the E2E does not simulate; it drives the same
  build controller the mouse uses.
- Breeding only pays with rarer lines or trait contracts (see BALANCE.md).

## Expeditions (T20)

- Founders rarer than 0.8 (epic and legendary) are **elusive**: they only appear at night, anywhere
  (hub or expedition), so by day roughly one founder in five is out of reach (Night Mode, the top
  bar). Hidden founders cannot be fed, baited or crated; toasts explain it.
- Expedition terrain is open wilds (no flat park). Biome colours follow the map seed rather than
  the map's named biome; per-map biome control is a polish item.

## Friends (T21)

- **Trade:** offer a creature from the Friends panel (belt slot Trade); the friend accepts or
  declines. The hand-over is atomic (sender removes first, then confirms), so nothing is duplicated.
  A creature in the breeding den cannot be offered. A swap is two offers.
- **Shared codex:** on connecting, each side sends the best individual of every species it found;
  new discoveries follow. Shared species show as "shared by a friend", unstudied.
- **Visit:** the guest sees a read-only copy of the host's pens and residents (their own park is
  hidden and locked). The host gets a toast. Photographing a visited creature works through the
  card export (E); the normal photo score ignores them.
- Not yet: joint breeding, duels, any trade value/escrow, an in-game friend list (the manual
  copy/paste connection is still the only way to link up).
- **Joint breeding (T22c):** in the Friends panel, "Breed together" on one of your adults living in
  a den pen proposes it; the friend picks one of theirs. Each side starts its own egg in its own
  den, pays its own cost and keeps its own parent; both children come from the same seeded litter
  (the proposer gets child 0, the other child 1). If one side cannot start (no den, no coins) the
  other's egg still hatches. The friend's parent shows as "(friend)" in the lineage.

## Arena (T22d-e)

- Optional (belt slot Arena). Pick up to three adults; combat stats come from the genome alone
  (size, limbs, parts, temperament, an archetype wheel where each beats the next two).
- The ladder has 8 seeded rungs. A first win pays 40 + 25 per rung and unlocks the next; repeat
  wins pay 4, so it cannot be farmed. Nothing ever dies or changes.
- Friend duels: challenge with a team; the friend answers with theirs; both run the same seeded
  fight and see identical logs. No coins change hands.
- Balance caveat: combat power and income are still correlated (both like size and rarity), though
  fewer than half of the top fighters are top earners.
