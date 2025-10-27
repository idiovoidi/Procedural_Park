# World State Integration Checklist

Use this checklist to integrate the world state system into AI Snap.

## Phase 1: Core Integration

### Game.ts
- [ ] Import `WorldStateManager` and helpers
- [ ] Add `worldStateManager` property
- [ ] Initialize in constructor
- [ ] Enable auto-save
- [ ] Add `getWorldStateManager()` getter
- [ ] Implement `saveGame(slotId)` method
- [ ] Implement `loadGame(slotId)` method
- [ ] Implement `restoreGameState(state)` method
- [ ] Implement `getPlayerProgress()` method
- [ ] Implement `setPlayerProgress(progress)` method
- [ ] Implement `getGalleryPhotos()` method
- [ ] Implement `loadGalleryPhotos(photos)` method
- [ ] Implement `exportSave(slotId)` method
- [ ] Implement `importSave(slotId, data)` method

### UIManager.ts
- [ ] Import `SaveLoadMenu`
- [ ] Add `saveLoadMenu` property
- [ ] Initialize in constructor
- [ ] Add `initializeSaveLoadMenu(manager)` method
- [ ] Add `toggleSaveLoadMenu()` method
- [ ] Add callback properties (onSaveGame, onLoadGame, etc.)
- [ ] Implement callback handlers
- [ ] Set audio callbacks on menu

### InputHandler.ts
- [ ] Add 'quicksave' action (F5)
- [ ] Add 'quickload' action (F9)
- [ ] Add 'saveloadmenu' action (Escape)
- [ ] Add callbacks to InputHandlerCallbacks interface
- [ ] Wire up callbacks in Game.ts

## Phase 2: UI Setup

### index.html
- [ ] Add save/load button to topbar
- [ ] Add appropriate icon (💾)
- [ ] Add title/tooltip

### UIManager Event Listeners
- [ ] Add click listener for save/load button
- [ ] Wire up to `toggleSaveLoadMenu()`
- [ ] Add audio feedback

### CSS (Already Done)
- [x] Save/load menu styles added
- [x] Slot card styles
- [x] Storage bar styles
- [x] Button styles

## Phase 3: Progress Tracking

### Photo System Integration
- [ ] Import `updateProgressWithPhoto`
- [ ] Track player progress object
- [ ] Update progress on photo capture
- [ ] Track creatures discovered
- [ ] Track rarity tiers
- [ ] Track best scores

### Play Time Tracking
- [ ] Use `worldStateManager.getSessionPlayTime()`
- [ ] Add to total on save
- [ ] Reset tracker on load

### Gallery Integration
- [ ] Store photos with metadata
- [ ] Include in save snapshot
- [ ] Restore on load
- [ ] Handle photo data URLs

## Phase 4: State Serialization

### Camera State
- [ ] Serialize position
- [ ] Serialize rotation
- [ ] Serialize mode (ride/freeroam)
- [ ] Serialize ride progress (if applicable)
- [ ] Restore on load

### Settings State
- [ ] Serialize day/night mode
- [ ] Serialize audio enabled
- [ ] Serialize ambient volume
- [ ] Serialize shader enabled
- [ ] Serialize show creature info
- [ ] Restore on load

### Optional: Creature State
- [ ] Decide if saving exact creatures
- [ ] Serialize creature positions
- [ ] Serialize creature anatomy
- [ ] Restore on load (or regenerate from seed)

## Phase 5: Testing

### Basic Functionality
- [ ] Can save to slot
- [ ] Can load from slot
- [ ] Can delete slot
- [ ] Quick save works (F5)
- [ ] Quick load works (F9)
- [ ] Menu opens (Escape)
- [ ] Menu closes

### Data Persistence
- [ ] Progress persists across saves
- [ ] Camera state restores correctly
- [ ] Gallery photos restore
- [ ] Settings restore
- [ ] Play time accumulates

### UI/UX
- [ ] Save slots display metadata
- [ ] Empty slots show correctly
- [ ] Storage bar updates
- [ ] Toast notifications show
- [ ] Confirmation dialogs work
- [ ] Audio feedback plays

### Edge Cases
- [ ] Save with no photos
- [ ] Load non-existent slot
- [ ] Storage quota exceeded
- [ ] Corrupted save data
- [ ] Browser data cleared
- [ ] Multiple tabs (localStorage sync)

### Import/Export
- [ ] Can export save
- [ ] JSON format is valid
- [ ] Can import save
- [ ] Imported save works

## Phase 6: Polish

### User Experience
- [ ] Add loading indicators
- [ ] Add success/error messages
- [ ] Add confirmation dialogs
- [ ] Add keyboard shortcuts help
- [ ] Add tooltips

### Performance
- [ ] Auto-save doesn't lag
- [ ] Large saves don't freeze
- [ ] Photo compression (optional)
- [ ] Limit photo count (optional)

### Documentation
- [ ] Update README with save/load info
- [ ] Add keyboard shortcuts to help
- [ ] Document storage limits
- [ ] Add troubleshooting guide

## Phase 7: Optional Enhancements

### Advanced Features
- [ ] Save thumbnails
- [ ] Multiple auto-save slots
- [ ] Save compression
- [ ] Cloud sync integration
- [ ] Achievement system
- [ ] Statistics dashboard

### Quality of Life
- [ ] Auto-save on photo milestones
- [ ] Save on page unload
- [ ] Backup saves
- [ ] Save naming
- [ ] Save sorting

## Verification

### Final Checks
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All features work
- [ ] Performance is good
- [ ] UI is responsive
- [ ] Documentation is complete

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## Rollback Plan

If issues occur:
1. Disable auto-save
2. Remove UI button
3. Keep system for future use
4. Document issues

## Support

- See `docs/modules/world-state-system.md` for API docs
- See `docs/WORLD-STATE-INTEGRATION-GUIDE.md` for step-by-step guide
- See `examples/world-state-integration.ts` for code examples
- See `examples/world-state-demo.ts` for standalone demo

## Notes

- localStorage limit is typically 5-10MB
- Photos can be large (consider compression)
- Saves are local only (no cloud sync)
- Clearing browser data deletes saves
- Consider warning users about this
