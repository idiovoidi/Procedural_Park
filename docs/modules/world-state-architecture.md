# World State System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Game.ts                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         WorldStateManager Instance                      │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  Save/Load   │        │  localStorage│
│  UI Menu     │        │   (Browser)  │
└──────────────┘        └──────────────┘
```

## Component Relationships

```
WorldStateManager
    │
    ├─► localStorage (read/write)
    │
    ├─► world-state-serializer (helpers)
    │   ├─► serializeCreature()
    │   ├─► serializeCameraState()
    │   ├─► createWorldStateSnapshot()
    │   └─► updateProgressWithPhoto()
    │
    └─► world-state-types (interfaces)
        ├─► WorldState
        ├─► PlayerProgress
        ├─► SerializedCreature
        ├─► SerializedPhoto
        └─► SaveSlotMetadata
```

## Data Flow

### Saving

```
Game State (Runtime)
    │
    ├─► Creatures (Three.js objects)
    ├─► Camera (Three.js Camera)
    ├─► Progress (in-memory)
    ├─► Photos (data URLs)
    └─► Settings (config)
    │
    ▼
createWorldStateSnapshot()
    │
    ├─► serializeCreature() ──► SerializedCreature
    ├─► serializeCameraState() ──► SerializedCameraState
    └─► format other data ──► WorldState
    │
    ▼
WorldStateManager.createSave()
    │
    ├─► JSON.stringify()
    └─► localStorage.setItem()
```

### Loading

```
localStorage.getItem()
    │
    ▼
JSON.parse()
    │
    ▼
WorldState object
    │
    ├─► progress ──► Update UI state
    ├─► camera ──► Restore camera position/rotation
    ├─► photos ──► Populate gallery
    ├─► settings ──► Apply game settings
    └─► worldSeed ──► Regenerate world
    │
    ▼
Game State (Runtime) restored
```

## Storage Structure

```
localStorage
│
├─► aisnap_save_slot_1: { WorldState JSON }
├─► aisnap_save_slot_2: { WorldState JSON }
├─► aisnap_save_slot_3: { WorldState JSON }
├─► aisnap_save_slot_4: { WorldState JSON }
├─► aisnap_save_slot_5: { WorldState JSON }
├─► aisnap_save_quicksave: { WorldState JSON }
└─► aisnap_save_metadata: [ SaveSlotMetadata[] ]
```

## WorldState Structure

```typescript
WorldState {
  version: "1.0.0"
  saveDate: 1234567890
  worldSeed: 1337
  
  progress: {
    photoCount: 42
    totalScore: 3500
    bestScore: 95
    creaturesDiscovered: Set<string>
    rarityTiers: { common, uncommon, rare, epic, legendary }
    playTime: 7200
    lastPlayed: 1234567890
  }
  
  camera: {
    mode: "freeroam"
    position: { x, y, z }
    rotation: { x, y, z }
    rideProgress: 0.5
  }
  
  photos: [
    { dataUrl, score, creatureName, timestamp }
  ]
  
  settings: {
    seed: 1337
    dayNightMode: "day"
    audioEnabled: true
    ambientVolume: 0.5
    shaderEnabled: true
    showCreatureInfo: true
  }
  
  creatures?: [ SerializedCreature[] ]
  experimentCreature?: SerializedCreature
}
```

## UI Component Hierarchy

```
SaveLoadMenu (Component)
    │
    ├─► Modal Overlay
    │   └─► Modal Content
    │       ├─► Header (title + close button)
    │       ├─► Body
    │       │   ├─► Save Slots Container
    │       │   │   ├─► Slot 1 Card
    │       │   │   ├─► Slot 2 Card
    │       │   │   ├─► Slot 3 Card
    │       │   │   ├─► Slot 4 Card
    │       │   │   └─► Slot 5 Card
    │       │   ├─► Actions
    │       │   │   ├─► Quick Save Button
    │       │   │   ├─► Quick Load Button
    │       │   │   └─► Clear All Button
    │       │   └─► Storage Info
    │       │       ├─► Storage Bar
    │       │       └─► Storage Text
    │       └─► Footer
    │
    └─► Callbacks
        ├─► onSave(slotId)
        ├─► onLoad(slotId)
        ├─► onDelete(slotId)
        ├─► onExport(slotId)
        └─► onImport(slotId, data)
```

## Integration Flow

```
1. Game Initialization
   └─► new WorldStateManager()
   └─► new SaveLoadMenu()
   └─► Setup callbacks

2. Player Takes Photo
   └─► updateProgressWithPhoto()
   └─► Auto-save (if enabled)

3. Player Presses F5 (Quick Save)
   └─► createWorldStateSnapshot()
   └─► WorldStateManager.quickSave()
   └─► Show toast notification

4. Player Opens Save Menu (Esc)
   └─► SaveLoadMenu.open()
   └─► Display all slots with metadata
   └─► Show storage info

5. Player Clicks Save Button
   └─► Callback: onSave(slotId)
   └─► createWorldStateSnapshot()
   └─► WorldStateManager.createSave()
   └─► Refresh UI

6. Player Clicks Load Button
   └─► Callback: onLoad(slotId)
   └─► WorldStateManager.loadSave()
   └─► restoreGameState()
   └─► Close menu

7. Player Exports Save
   └─► WorldStateManager.exportSave()
   └─► Create Blob
   └─► Download JSON file

8. Auto-Save Timer
   └─► Every N seconds
   └─► createWorldStateSnapshot()
   └─► WorldStateManager.quickSave()
```

## State Machine Integration

```
GameStateManager (Flow State)
    │
    ├─► loading
    ├─► menu
    ├─► playing ◄─── Save/Load happens here
    ├─► paused
    └─► ...

SubsystemStateManager
    │
    ├─► camera state
    ├─► UI state
    ├─► creatures state
    └─► ...

WorldStateManager (Persistence)
    │
    └─► Saves/loads both flow and subsystem state
```

## Error Handling

```
Save Operation
    │
    ├─► Try: JSON.stringify()
    │   └─► Catch: Log error, return false
    │
    ├─► Try: localStorage.setItem()
    │   └─► Catch: QuotaExceededError
    │       └─► Show "Storage full" message
    │
    └─► Success: Update metadata, return true

Load Operation
    │
    ├─► Try: localStorage.getItem()
    │   └─► Catch: Log error, return null
    │
    ├─► Try: JSON.parse()
    │   └─► Catch: Corrupted save, return null
    │
    ├─► Version check
    │   └─► Migrate if needed
    │
    └─► Success: Return WorldState
```

## Performance Considerations

- **Serialization**: O(n) where n = number of creatures
- **Storage**: ~1-5KB per save (without photos)
- **Photos**: Can be large (base64 encoded images)
- **Auto-save**: Debounced to avoid performance impact
- **Load time**: Minimal (localStorage is synchronous)

## Security Considerations

- **No encryption**: Data stored as plain JSON
- **No validation**: Trust localStorage data
- **XSS risk**: Sanitize if displaying user data
- **Storage limit**: Browser enforced (5-10MB)

## Browser Compatibility

- **localStorage**: Supported in all modern browsers
- **JSON**: Native support
- **Blob/URL**: For export functionality
- **FileReader**: For import functionality
