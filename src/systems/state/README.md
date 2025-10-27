# State Management System

This directory contains the state management system for AI Snap, including game flow states, subsystem states, and world state persistence.

## Modules

### Game Flow State (`state-machine.ts`, `GameStateManager.ts`)
Manages high-level game states like loading, menu, playing, paused, etc.

### Subsystem State (`subsystem-state-manager.ts`, `subsystem-states.ts`)
Manages state for individual game systems (camera, UI, creatures, multiplayer, etc.)

### State Integration (`state-integration.ts`)
Connects flow state and subsystem state into a unified interface.

### World State Persistence (NEW)
- `WorldStateManager.ts` - Save/load game progress to localStorage
- `world-state-types.ts` - Type definitions for saveable state
- `world-state-serializer.ts` - Serialization helpers

## Quick Start

### Using World State

```typescript
import { WorldStateManager, createWorldStateSnapshot } from '@systems/state'

// Initialize
const worldState = new WorldStateManager()

// Save game
const snapshot = createWorldStateSnapshot({ /* game data */ })
worldState.createSave('slot_1', snapshot)

// Load game
const state = worldState.loadSave('slot_1')
```

See `docs/modules/world-state-system.md` for complete documentation.

## Files

- `state-machine.ts` - Core state machine implementation
- `GameStateManager.ts` - Game flow state manager
- `subsystem-state-manager.ts` - Subsystem state manager
- `subsystem-states.ts` - Subsystem state types
- `state-integration.ts` - Unified state interface
- `state-sync-helpers.ts` - Multiplayer state sync
- `WorldStateManager.ts` - Save/load manager
- `world-state-types.ts` - Save state types
- `world-state-serializer.ts` - Serialization utilities
- `index.ts` - Barrel exports
