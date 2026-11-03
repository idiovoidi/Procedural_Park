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

## Still open (candidates for the next pass)

- A pen without a bin silently wastes output (inspector shows `bin 0/0`; no explicit warning).
- Nothing in the UI paints ground, adds water, or buys land (GDD §6): coins pile up late.
- Residents cannot be hand-fed or photographed; the trough is the only food path.
- Real mouse placement needs pointer lock, which the E2E does not simulate; it drives the same
  build controller the mouse uses.
- Breeding only pays with rarer lines or trait contracts (see BALANCE.md).
