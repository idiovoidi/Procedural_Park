# Creature Collection Feature

## Overview

The Creature Collection is a UI system that allows players to capture and store up to 10 unique creatures. Captured creatures are displayed with thumbnails and can be exported as PNG files.

## How It Works

### Capturing Creatures

1. **Look at a creature** - Find a creature in the game world
2. **Press E** - Capture the creature (same targeting as photo system)
3. **Success!** - Creature is added to your collection with a toast notification

### Viewing Collection

- **Press K** or click the 📦 button to open the Creature Collection panel
- View all captured creatures with their:
  - Thumbnail image (512x512 render)
  - Name
  - Archetype (terrestrial, aerial, aquatic, etc.)
  - Size
  - Rarity badge (Common, Uncommon, Rare, Epic, Legendary)

### Exporting Creatures

1. Open the collection (K key)
2. Click **💾 Export PNG** on any creature card
3. PNG file downloads to your browser's Downloads folder

### Managing Collection

- **Maximum 10 creatures** - Oldest is removed when capturing an 11th
- **No duplicates** - Same creature won't be added twice
- **Remove creatures** - Click 🗑️ Remove button on any card
- **Persistent storage** - Collection saved in browser localStorage

## Keybindings

- **E** - Capture creature in view
- **K** - Toggle Creature Collection panel
- **📦 Button** - Toggle collection (top-right UI)

## Technical Details

### Storage

- Creatures stored in localStorage as `captured-creature-{id}`
- Each entry contains:
  - Unique ID (name + seed + rarity)
  - Full metadata (anatomy, rarity, seed, capture date)
  - Base64 thumbnail image (512x512 PNG)
  - Capture timestamp

### Rendering

- Uses offscreen WebGL renderer (512x512)
- Isolated scene with proper lighting
- Creature centered and scaled to fit
- 2-second debug preview in dev mode (top-right corner)

### UI Components

**Files:**
- `src/ui/components/creature-collection.ts` - Collection UI logic
- `src/systems/photo/CreatureCardExporter.ts` - Creature rendering
- `src/ui/managers/UIManager.ts` - Integration
- `index.html` - Collection panel HTML
- `src/style.css` - Collection styles

### Rarity System

Creatures are color-coded by rarity:

- **⚪ Common** (0.0 - 0.2) - Gray
- **🔹 Uncommon** (0.2 - 0.4) - Green
- **🔷 Rare** (0.4 - 0.6) - Blue
- **💎 Epic** (0.6 - 0.8) - Purple
- **⭐ Legendary** (0.8 - 1.0) - Gold with glow animation

## User Experience

### Feedback

- Toast notifications for all actions:
  - "📦 Captured {CreatureName}!" - Success
  - "Already have {CreatureName}" - Duplicate
  - "❌ No creature in view" - No target
  - "❌ Capture failed" - Error

### Empty State

When collection is empty:
```
📦 No creatures captured yet
Press E when looking at a creature to capture it!
```

### Full Collection

- Automatically removes oldest creature when capturing 11th
- No warning (seamless experience)

## Export Format

**Filename:** `creature-card-{CreatureName}.png`

**Image:** 512x512 PNG with transparent background

**Metadata:** Stored separately in localStorage with key `creature-card-{name}-{timestamp}`

## Future Enhancements

1. **PNG Metadata Embedding** - Store JSON in PNG tEXt chunks
2. **Creature Stats Display** - Show detailed anatomy info on hover
3. **Sorting/Filtering** - Sort by rarity, name, capture date
4. **Search** - Find creatures by name
5. **Collection Progress** - Track unique creatures discovered
6. **Share Collection** - Export entire collection as JSON
7. **Import Creatures** - Load creature cards from files
8. **Creature Comparison** - Compare two creatures side-by-side
9. **Collection Achievements** - Rewards for completing sets
10. **Creature Spawning** - Spawn captured creatures in-game

## Browser Compatibility

Requires:
- WebGL 2.0
- Canvas API with toDataURL()
- localStorage
- Blob API and URL.createObjectURL()

Supported browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Notes

- Collection persists across sessions (localStorage)
- Clearing browser data will reset collection
- Each creature takes ~100-200KB in localStorage
- Maximum 10 creatures = ~1-2MB storage
- Export works reliably via Blob API
- Debug canvas visible in dev mode (top-right, 2 seconds)
