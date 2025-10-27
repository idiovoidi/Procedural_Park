# World State System - Complete Guide

A comprehensive save/load system for AI Snap that persists player progress across browser sessions.

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](WORLD-STATE-QUICKSTART.md)** - Get running in 5 minutes
- **[Integration Guide](WORLD-STATE-INTEGRATION-GUIDE.md)** - Step-by-step integration
- **[Integration Checklist](WORLD-STATE-CHECKLIST.md)** - Complete checklist

### Technical Documentation
- **[API Documentation](modules/world-state-system.md)** - Complete API reference
- **[Architecture](modules/world-state-architecture.md)** - System design and data flow
- **[Implementation Summary](task_summary/world-state-system-implementation.md)** - What was built

### Code Examples
- **[Integration Examples](../examples/world-state-integration.ts)** - Real-world usage
- **[Demo](../examples/world-state-demo.ts)** - Standalone demonstration

## 🎯 What It Does

The World State System allows players to:
- Save game progress to multiple slots
- Load previous game states
- Quick save/load with keyboard shortcuts
- Export/import saves as JSON files
- Track statistics and achievements
- Auto-save at configurable intervals

## 📦 What Gets Saved

- **Player Progress**: Photos, scores, creatures discovered, play time
- **Camera State**: Position, rotation, mode (ride/freeroam)
- **Gallery**: Photo data URLs with scores and creature names
- **Settings**: Audio, shaders, day/night mode, preferences
- **World Seed**: For procedural generation consistency
- **Optional**: Exact creature positions and states

## 🚀 Quick Start

```typescript
// 1. Initialize
import { WorldStateManager, createWorldStateSnapshot } from '@systems/state'
const manager = new WorldStateManager()

// 2. Save
const snapshot = createWorldStateSnapshot({ /* game data */ })
manager.createSave('slot_1', snapshot)

// 3. Load
const state = manager.loadSave('slot_1')
```

See [Quick Start Guide](WORLD-STATE-QUICKSTART.md) for complete example.

## 📁 File Structure

```
src/systems/state/
├── WorldStateManager.ts          # Main save/load manager
├── world-state-types.ts           # Type definitions
├── world-state-serializer.ts      # Serialization helpers
├── index.ts                       # Exports
└── README.md                      # Module overview

src/ui/components/
└── save-load-menu.ts              # UI component

docs/
├── WORLD-STATE-README.md          # This file
├── WORLD-STATE-QUICKSTART.md      # 5-minute guide
├── WORLD-STATE-INTEGRATION-GUIDE.md # Step-by-step
├── WORLD-STATE-CHECKLIST.md       # Integration checklist
└── modules/
    ├── world-state-system.md      # API docs
    └── world-state-architecture.md # Architecture

examples/
├── world-state-integration.ts     # Integration examples
└── world-state-demo.ts            # Standalone demo
```

## 🎮 Features

### Multiple Save Slots
- 5 numbered slots (slot_1 to slot_5)
- 1 quick save slot
- Metadata for each slot (date, photos, score, play time)

### Auto-Save
- Configurable interval (default: 60 seconds)
- Can be enabled/disabled
- Uses quick save slot

### Import/Export
- Export saves as JSON files
- Import saves from JSON
- Useful for backups and sharing

### Storage Management
- Monitor localStorage usage
- Display storage percentage
- Warn when approaching limits

### UI Components
- Visual save slot cards
- Save/load/delete/export buttons
- Storage usage indicator
- Confirmation dialogs

## ⌨️ Keyboard Shortcuts

- **F5** - Quick Save
- **F9** - Quick Load
- **Escape** - Open Save/Load Menu

## 🔧 Integration Steps

1. **Initialize Manager** - Add to Game.ts
2. **Create Save Function** - Snapshot current state
3. **Create Load Function** - Restore state
4. **Add UI Components** - Save/load menu
5. **Setup Shortcuts** - Keyboard bindings
6. **Track Progress** - Update on events
7. **Test** - Verify functionality

See [Integration Guide](WORLD-STATE-INTEGRATION-GUIDE.md) for details.

## 📊 Data Structure

```typescript
WorldState {
  version: "1.0.0"
  saveDate: timestamp
  worldSeed: number
  
  progress: {
    photoCount: number
    totalScore: number
    bestScore: number
    creaturesDiscovered: Set<string>
    rarityTiers: { common, uncommon, rare, epic, legendary }
    playTime: seconds
    lastPlayed: timestamp
  }
  
  camera: {
    mode: "ride" | "freeroam"
    position: { x, y, z }
    rotation: { x, y, z }
    rideProgress: number
  }
  
  photos: [
    { dataUrl, score, creatureName, timestamp }
  ]
  
  settings: {
    dayNightMode: "day" | "night"
    audioEnabled: boolean
    ambientVolume: number
    shaderEnabled: boolean
    showCreatureInfo: boolean
  }
}
```

## 🎨 UI Preview

```
┌─────────────────────────────────────────┐
│  💾 Save / Load Game               [×]  │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Slot 1      │  │ Slot 2      │      │
│  │ 2 hours ago │  │ Empty       │      │
│  │ Photos: 42  │  │             │      │
│  │ Score: 3500 │  │ [💾 Save]   │      │
│  │ [💾][📂][🗑]│  │             │      │
│  └─────────────┘  └─────────────┘      │
│                                         │
│  [💾 Quick Save] [📂 Quick Load]       │
│                                         │
│  Storage: ████░░░░░░ 45% (2.3 MB)     │
└─────────────────────────────────────────┘
```

## 🔍 API Overview

### WorldStateManager

```typescript
// Create/Load
createSave(slotId: string, state: WorldState): boolean
loadSave(slotId: string): WorldState | null
deleteSave(slotId: string): boolean

// Quick Save/Load
quickSave(state: WorldState): boolean
quickLoad(): WorldState | null

// Metadata
getAllMetadata(): SaveSlotMetadata[]
getMetadata(slotId: string): SaveSlotMetadata | null
hasSave(slotId: string): boolean

// Import/Export
exportSave(slotId: string): string | null
importSave(slotId: string, json: string): boolean

// Auto-Save
setAutoSaveEnabled(enabled: boolean): void
setAutoSaveInterval(ms: number): void

// Storage
getStorageInfo(): { used, available, percentage }
clearAllSaves(): boolean
```

### Serialization Helpers

```typescript
createWorldStateSnapshot(params): WorldState
serializeCreature(creature): SerializedCreature
serializeCameraState(camera, mode): SerializedCameraState
updateProgressWithPhoto(progress, score, name, rarity): PlayerProgress
formatPlayTime(seconds): string
formatSaveDate(timestamp): string
```

## ⚠️ Limitations

- **localStorage only** - No cloud sync
- **5-10MB limit** - Browser enforced
- **No encryption** - Plain JSON storage
- **Local to browser** - Lost if data cleared
- **Synchronous** - May block on large saves

## 🚧 Future Enhancements

- Cloud save integration
- Save file compression
- Encrypted saves
- Save thumbnails
- Achievement tracking
- Statistics dashboard
- Undo/redo system
- Save state diffing

## 🐛 Troubleshooting

### Save Not Working
```typescript
// Check storage
const info = manager.getStorageInfo()
console.log(`Storage: ${info.percentage}%`)

// Check for errors
try {
  manager.createSave('test', snapshot)
} catch (e) {
  console.error('Save failed:', e)
}
```

### Load Not Working
```typescript
// Check if save exists
console.log('Has save:', manager.hasSave('slot_1'))

// Check loaded data
const state = manager.loadSave('slot_1')
console.log('Loaded:', state)
```

### Storage Full
```typescript
// Clear old saves
manager.deleteSave('slot_1')

// Or clear all
manager.clearAllSaves()

// Reduce photo quality
// Limit number of photos saved
```

## 📝 Best Practices

1. **Save Frequently** - Enable auto-save or prompt users
2. **Validate on Load** - Check for corruption
3. **Handle Errors** - Wrap in try-catch
4. **Inform Users** - Show notifications
5. **Backup Important Saves** - Encourage exports
6. **Monitor Storage** - Warn when approaching limits
7. **Version Migration** - Plan for format changes

## 🧪 Testing

Run the demo:
```typescript
import { demoWorldState } from '@examples/world-state-demo'
demoWorldState()
```

Check the console for output showing all features.

## 📞 Support

- **Issues**: Check troubleshooting section
- **Questions**: See API documentation
- **Examples**: Check examples directory
- **Integration**: Follow integration guide

## 📄 License

Part of AI Snap project.

## 🎉 Credits

Built for AI Snap - A 3D wildlife photography game.

---

**Ready to integrate?** Start with the [Quick Start Guide](WORLD-STATE-QUICKSTART.md)!
