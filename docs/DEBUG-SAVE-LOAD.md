# Debug Save/Load Menu

## Quick Debug Steps

1. **Open the game** at http://localhost:3001/Procedural_Park/
2. **Open browser console** (F12)
3. **Click the 💾 button**
4. **Check console for**:
   - "toggleSaveLoadMenu called"
   - "SaveLoadMenu.toggle() called, isOpen: false"
   - "worldStateManager: WorldStateManager {...}"

## If Nothing Happens

### Check 1: Button Exists
```javascript
// In browser console:
document.getElementById('toggleSaveLoad')
// Should return: <button id="toggleSaveLoad">💾</button>
```

### Check 2: Event Listener Attached
```javascript
// Check if button has click listener
const btn = document.getElementById('toggleSaveLoad')
console.log(btn)
// Click it manually:
btn.click()
```

### Check 3: Menu Element Exists
```javascript
// Check if menu was created
document.getElementById('save-load-menu')
// Should return: <div id="save-load-menu" class="modal-overlay hidden">...</div>
```

### Check 4: WorldStateManager Initialized
```javascript
// Check if manager exists (if game is exposed)
// This won't work unless we expose it, but worth trying
window.game?.worldStateManager
```

## Common Issues

### Issue 1: CSS Not Loaded
**Symptom**: Menu opens but is invisible
**Fix**: Check if modal-overlay styles exist in style.css

### Issue 2: WorldStateManager Not Initialized
**Symptom**: Console shows "worldStateManager: null"
**Fix**: Check Game.ts initializeWorldState() is called

### Issue 3: Button Not Found
**Symptom**: Console shows "Cannot read property 'addEventListener' of null"
**Fix**: Check index.html has button with id="toggleSaveLoad"

### Issue 4: Menu Not Created
**Symptom**: document.getElementById('save-load-menu') returns null
**Fix**: Check SaveLoadMenu constructor is called in UIManager

## Manual Test

Try opening the menu manually from console:

```javascript
// Get the menu element
const menu = document.getElementById('save-load-menu')

// Remove hidden class
menu.classList.remove('hidden')

// Should now be visible!
```

## Force Refresh

Sometimes the browser caches old code:
1. Press **Ctrl+Shift+R** (hard refresh)
2. Or clear cache and reload
3. Or open in incognito mode

## Check Build

Make sure the latest code is built:
```bash
npm run build
# Or if using dev server, it should auto-reload
```

## Next Steps

Once you see the console logs, we can determine:
- Is the button click working?
- Is the toggle method being called?
- Is the worldStateManager initialized?
- Is the menu element created?

Then we can fix the specific issue!
