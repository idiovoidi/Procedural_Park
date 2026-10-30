# Save / Load

Players can save and restore their progress. Saves live in browser `localStorage`.

## Using it

| Control | Action |
|---|---|
| 💾 button | Open the save/load menu (5 slots) |
| F5 | Quick save (`quicksave` slot) |
| F9 | Quick load |
| Menu → Export / Import | Download a slot as JSON, or load a JSON file into a slot |
| Menu → Delete | Remove a slot |

Auto-save runs every 2 minutes (`GAME_CONFIG.AUTO_SAVE_INTERVAL_MS`).

## What is saved

- Gallery photos (base64 data URLs) with score, creature name and timestamp
- Progress: photo count, total score, best score, play time
- Camera position, rotation and mode
- Settings: day/night mode, shader on/off, audio and creature-info flags
- World seed (creatures and terrain regenerate from it on load)

Creatures are not serialized; on load they respawn from the seed.

## Where the code lives

- `src/game/managers/SaveLoadManager.ts` – wires the menu and F5/F9 to the world state manager, builds snapshots and restores state. Failures are logged with `log.error` and shown to the player as a toast.
- `src/systems/state/WorldStateManager.ts` – slot storage, metadata, auto-save, export/import.
- `src/systems/state/world-state-serializer.ts` and `world-state-types.ts` – snapshot format (JSON with a version field).
- `src/ui/components/save-load-menu.ts` – the menu UI.

Architecture and API details: [modules/world-state-system.md](modules/world-state-system.md) and [modules/world-state-architecture.md](modules/world-state-architecture.md).

## Limits

- Local to one browser/device; clearing site data deletes saves.
- `localStorage` quota is roughly 5–10 MB; photos dominate usage. The menu shows a storage bar.
- Saves are plain, unencrypted JSON.

## Manual test checklist

1. Take a few photos, press F5, take more, press F9 – the earlier gallery and stats return.
2. Save to two different slots; each shows its own photo count, score and time.
3. Export a slot, delete it, import the file into the slot, load it.
4. Fill storage (many photos) and confirm a failed save shows an error toast rather than failing silently.

## Troubleshooting

If the 💾 button or menu does nothing:

1. Check the console for errors (F12). Run `document.getElementById('toggleSaveLoad')` and `document.getElementById('save-load-menu')` – both should be non-null.
2. Hard refresh (Ctrl+Shift+R) to drop cached code.
3. Confirm `localStorage` is available (private windows and blocked site data can disable it).
4. `window.game` is exposed in the console for inspection.

If load does not restore: confirm the slot exists in the menu, then export it and inspect the JSON.
If storage is full: delete old saves or clear gallery photos.
