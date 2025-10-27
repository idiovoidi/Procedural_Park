# Save/Load Menu Troubleshooting

## Current Status

The save/load system has been integrated with comprehensive logging. Here's how to diagnose issues:

## Step 1: Check Browser Console

1. Open the game at http://localhost:3001/Procedural_Park/
2. Open browser console (F12 → Console tab)
3. Look for these messages on page load:

```
toggleSaveLoad button found: <button>
Adding click listener to save/load button
```

If you see these, the button is properly initialized.

## Step 2: Click the 💾 Button

Click the save/load button and check console for:

```
Save/load button clicked!
toggleSaveLoadMenu called
SaveLoadMenu.toggle() called, isOpen: false
worldStateManager: WorldStateManager {...}
```

## Diagnosis Based on Console Output

### Scenario A: No messages at all
**Problem**: Button not found or listener not attached
**Check**:
```javascript
// In console:
document.getElementById('toggleSaveLoad')
```
**Fix**: Hard refresh (Ctrl+Shift+R) or check if index.html has the button

### Scenario B: "toggleSaveLoad button not found in DOM!"
**Problem**: Button doesn't exist in HTML
**Fix**: Verify index.html has:
```html
<button id="toggleSaveLoad" title="Save/Load Game (F5/F9)">💾</button>
```

### Scenario C: Button found but no click message
**Problem**: Event listener not attached
**Fix**: Check if setupEventListeners() is being called

### Scenario D: Click works but "worldStateManager: null"
**Problem**: WorldStateManager not initialized
**Fix**: Check if Game.ts initializeWorldState() is called

### Scenario E: Everything logs but menu doesn't appear
**Problem**: CSS issue or menu element not created
**Check**:
```javascript
// In console:
document.getElementById('save-load-menu')
```
**Fix**: Check if modal-overlay CSS exists

## Manual Tests

### Test 1: Check Button Exists
```javascript
const btn = document.getElementById('toggleSaveLoad')
console.log('Button:', btn)
console.log('Button text:', btn?.textContent)
```

### Test 2: Manually Trigger Click
```javascript
const btn = document.getElementById('toggleSaveLoad')
btn.click()
// Check console for messages
```

### Test 3: Check Menu Element
```javascript
const menu = document.getElementById('save-load-menu')
console.log('Menu element:', menu)
console.log('Menu classes:', menu?.className)
```

### Test 4: Manually Open Menu
```javascript
const menu = document.getElementById('save-load-menu')
menu.classList.remove('hidden')
// Menu should now be visible
```

### Test 5: Check WorldStateManager
```javascript
// This requires exposing game instance
// Add to Game.ts: window.game = this
console.log(window.game?.worldStateManager)
```

## Common Fixes

### Fix 1: Hard Refresh
Sometimes browser caches old code:
- Press **Ctrl+Shift+R** (Windows/Linux)
- Press **Cmd+Shift+R** (Mac)
- Or clear cache and reload

### Fix 2: Check Dev Server
Make sure dev server is running:
```bash
npm run dev
```
Should show: `http://localhost:3001/Procedural_Park/`

### Fix 3: Rebuild
```bash
npm run build
```

### Fix 4: Check for JavaScript Errors
Look for any red errors in console that might be blocking execution

## Expected Console Output (Success)

When everything works, you should see:

```
// On page load:
toggleSaveLoad button found: <button id="toggleSaveLoad">💾</button>
Adding click listener to save/load button

// On button click:
Save/load button clicked!
toggleSaveLoadMenu called
SaveLoadMenu.toggle() called, isOpen: false
worldStateManager: WorldStateManager {currentSlotId: null, autoSaveEnabled: true, ...}

// Menu should now be visible with 5 empty slots
```

## If Menu Opens But Is Empty

This means worldStateManager is null. Check:

1. Is `initializeWorldState()` called in Game.ts?
2. Is it called BEFORE the UI is shown?
3. Are there any errors in the console?

## If Menu Opens But Looks Wrong

Check CSS:
1. Are modal-overlay styles in style.css?
2. Is the CSS file loaded?
3. Try inspecting the element (right-click → Inspect)

## Still Not Working?

### Enable More Logging

Add to Game.ts initializeWorldState():
```typescript
private initializeWorldState(): void {
  console.log('=== Initializing World State ===')
  this.worldStateManager = new WorldStateManager()
  console.log('WorldStateManager created:', this.worldStateManager)
  
  const saveLoadMenu = this.systems.ui.getSaveLoadMenu()
  console.log('SaveLoadMenu:', saveLoadMenu)
  
  saveLoadMenu.setWorldStateManager(this.worldStateManager)
  console.log('WorldStateManager set on menu')
  // ... rest of code
}
```

### Check Initialization Order

The order should be:
1. UIManager created (creates SaveLoadMenu)
2. Game.initialize() called
3. initializeWorldState() called
4. setWorldStateManager() called
5. Button click should now work

### Expose Game Instance

Add to Game.ts for debugging:
```typescript
constructor(container: HTMLElement) {
  this.container = container
  this.initPromise = this.initialize()
  
  // For debugging
  if (import.meta.env.DEV) {
    ;(window as any).game = this
  }
}
```

Then in console:
```javascript
window.game.worldStateManager
window.game.systems.ui.getSaveLoadMenu()
```

## Next Steps

Once you identify which scenario matches your console output, follow the corresponding fix. The logging should make it clear where the issue is!
