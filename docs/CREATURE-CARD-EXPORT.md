# Creature Card Export Feature

## Overview

The Creature Card Export feature allows players to capture and export creature data as PNG images with embedded metadata. This enables sharing creatures and potentially reconstructing them in the future.

## Usage

1. **Find a creature** - Navigate to a creature you want to capture
2. **Press E** - Export the creature card (same targeting as photo system)
3. **Download** - A PNG file will be automatically downloaded with the creature's name

## Technical Details

### What Gets Exported

Each creature card contains:
- **Visual render** - 512x512 isolated render of the creature
- **Metadata** - JSON data stored in localStorage including:
  - Creature name
  - Full anatomy data (body type, limbs, colors, patterns, etc.)
  - Rarity value
  - World seed
  - Capture timestamp

### File Structure

**Filename**: `creature-card-{CreatureName}.png`

**Metadata Storage**: 
- Stored in browser localStorage with key: `creature-card-{CreatureName}-{timestamp}`
- Contains full `CreatureCardMetadata` object

### Implementation

**Key Files**:
- `src/systems/photo/CreatureCardExporter.ts` - Core export logic
- `src/systems/photo/PhotoSystem.ts` - Integration with photo system
- `src/game/Game.ts` - Game-level export handler
- `src/systems/input/InputManager.ts` - Keybinding (E key)

**Rendering**:
- Uses offscreen WebGL renderer (512x512)
- Isolated scene with proper lighting
- Creature is centered and scaled to fit frame
- Transparent background

### Future Enhancements

1. **PNG Metadata Embedding** - Store JSON in PNG tEXt chunks instead of localStorage
2. **Creature Reconstruction** - Implement full creature rebuilding from metadata
3. **Card Styling** - Add decorative frame, stats overlay, rarity indicators
4. **Collection Management** - UI for viewing and managing exported cards
5. **Import Feature** - Load creature cards and spawn them in-game
6. **Sharing** - Export to clipboard or social media

## Keybindings

- **E** - Export creature card (game context, priority 2)
- **F** - Take photo (for comparison)

## API Reference

### CreatureCardExporter

```typescript
class CreatureCardExporter {
  // Export creature as PNG with metadata
  exportCreatureCard(creature: CreatureInstance, seed: number): Promise<void>
  
  // Extract metadata from localStorage
  static extractMetadata(creatureName: string): CreatureCardMetadata | null
  
  // Reconstruct creature from metadata (future)
  static reconstructCreature(metadata: CreatureCardMetadata): Promise<CreatureInstance | null>
}
```

### CreatureCardMetadata

```typescript
interface CreatureCardMetadata {
  version: string
  creatureName: string
  anatomy: Anatomy
  rarity: number
  seed: number
  captureDate: string
}
```

## Troubleshooting

If the download doesn't appear:
1. Check browser console (F12) for debug messages
2. Verify a creature is in view and not occluded
3. Check browser's download settings/permissions
4. Look in browser's Downloads folder or history (Ctrl+J)

See [CREATURE-CARD-TROUBLESHOOTING.md](./CREATURE-CARD-TROUBLESHOOTING.md) for detailed debugging steps.

## Notes

- Uses same creature targeting logic as photo system
- Shows toast notification on successful export
- Handles errors gracefully with user feedback
- No limit on number of exports
- Metadata persists in localStorage until cleared
- Console logging enabled for debugging
