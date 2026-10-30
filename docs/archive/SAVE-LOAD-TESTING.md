# Save/Load System - Testing Guide

The save/load system is now fully integrated! Here's how to test it.

## ✅ What Was Integrated

- **WorldStateManager** initialized in Game.ts
- **Save/Load Menu** wired up with callbacks
- **Keyboard Shortcuts** (F5/F9) working
- **Photo Tracking** saves photos to gallery
- **Auto-Save** enabled (every 2 minutes)

## 🧪 Testing Steps

### 1. Basic Save/Load

1. **Start the game**
2. **Take a few photos** (press F)
3. **Click the 💾 button** in the top bar
4. **Save/Load menu should open** showing 5 empty slots
5. **Click "💾 Save Here"** on Slot 1
6. **You should see**: "💾 Slot 1 saved!" toast
7. **Slot 1 should now show**:
   - Save date/time
   - Photo count
   - Total score
   - Play time
   - World seed

### 2. Load Save

1. **Take more photos** (to change state)
2. **Click 💾 button** again
3. **Click "📂 Load"** on Slot 1
4. **Confirm the load** (if prompted)
5. **You should see**: "📂 Slot 1 loaded!" toast
6. **Gallery should restore** to previous state
7. **Stats should match** saved values

### 3. Quick Save/Load

1. **Press F5** (Quick Save)
2. **You should see**: "💾 Quick Save saved!" toast
3. **Take more photos**
4. **Press F9** (Quick Load)
5. **You should see**: "📂 Quick Save loaded!" toast
6. **State should restore**

### 4. Multiple Slots

1. **Save to Slot 1** with 5 photos
2. **Take 5 more photos** (total 10)
3. **Save to Slot 2**
4. **Load Slot 1** - should have 5 photos
5. **Load Slot 2** - should have 10 photos

### 5. Export/Import

1. **Save to a slot**
2. **Click "📤 Export"** button
3. **JSON file should download**
4. **Open JSON** - verify it contains game data
5. **Delete the save slot**
6. **Click "📥 Import"** (if available)
7. **Select the JSON file**
8. **Save should restore**

### 6. Delete Save

1. **Save to a slot**
2. **Click "🗑️ Delete"** button
3. **Confirm deletion**
4. **Slot should become empty**
5. **You should see**: "🗑️ Save deleted" toast

### 7. Storage Info

1. **Create multiple saves**
2. **Check storage bar** at bottom of menu
3. **Should show**: Used KB / Available KB (X%)
4. **Bar should fill** as more saves are created

### 8. Auto-Save

1. **Play for 2+ minutes**
2. **Check browser console** for "🔄 Auto-saving..." message
3. **Quick save slot** should update automatically

## 🔍 What to Check

### Save Data Includes:
- ✅ Photo count
- ✅ Total score
- ✅ Best score
- ✅ Play time
- ✅ World seed
- ✅ Camera position/rotation
- ✅ Camera mode (ride/freeroam)
- ✅ Gallery photos (with data URLs)
- ✅ Settings (shader enabled, etc.)

### UI Elements:
- ✅ 💾 button in top bar
- ✅ Save/Load menu opens on click
- ✅ 5 save slots displayed
- ✅ Quick Save/Load buttons
- ✅ Storage usage bar
- ✅ Toast notifications

### Keyboard Shortcuts:
- ✅ F5 = Quick Save
- ✅ F9 = Quick Load
- ✅ Listed in shortcuts panel (H key)

## 🐛 Troubleshooting

### Menu doesn't open
- Check browser console for errors
- Verify button exists in HTML
- Check UIManager is initialized

### Save doesn't work
- Open browser console
- Look for "Save error:" messages
- Check localStorage is enabled
- Verify storage quota not exceeded

### Load doesn't restore correctly
- Check console for "Load error:" messages
- Verify save exists (check metadata)
- Try exporting save to see JSON structure

### Photos not saving
- Verify photos are being taken (check gallery)
- Check `galleryPhotos` array is populated
- Look for errors in takePhoto method

### Storage full
- Check storage info in menu
- Clear old saves
- Reduce photo quality (future enhancement)

## 📊 Browser Console Commands

Test the system from console:

```javascript
// Get game instance (if exposed)
const game = window.game

// Check if saves exist
localStorage.getItem('aisnap_save_slot_1')

// View all localStorage keys
Object.keys(localStorage).filter(k => k.startsWith('aisnap'))

// Clear all saves (careful!)
Object.keys(localStorage)
  .filter(k => k.startsWith('aisnap'))
  .forEach(k => localStorage.removeItem(k))

// Check storage usage
const used = JSON.stringify(localStorage).length
console.log(`Storage used: ${(used / 1024).toFixed(2)} KB`)
```

## ✨ Expected Behavior

### On Save:
1. Toast notification appears
2. Slot shows metadata
3. localStorage updated
4. No console errors

### On Load:
1. Toast notification appears
2. Camera position restores
3. Gallery photos restore
4. Stats update
5. No console errors

### On Delete:
1. Confirmation dialog (optional)
2. Toast notification
3. Slot becomes empty
4. localStorage cleared

## 🎯 Success Criteria

- [ ] Can save to any slot
- [ ] Can load from any slot
- [ ] Quick save/load works (F5/F9)
- [ ] Photos persist across saves
- [ ] Camera state restores
- [ ] Stats restore correctly
- [ ] Multiple slots work independently
- [ ] Delete removes saves
- [ ] Export downloads JSON
- [ ] Storage info displays
- [ ] No console errors
- [ ] Toast notifications show

## 📝 Notes

- **localStorage limit**: ~5-10MB per domain
- **Photos are large**: Base64 encoded images
- **Auto-save**: Every 2 minutes to quicksave
- **No cloud sync**: Saves are local only
- **Browser data**: Clearing browser data deletes saves

## 🚀 Next Steps

If everything works:
1. ✅ System is ready to use!
2. Consider adding save thumbnails
3. Consider photo compression
4. Consider cloud sync integration
5. Add achievement tracking
6. Add statistics dashboard

If issues occur:
1. Check browser console
2. Verify localStorage enabled
3. Check storage quota
4. Review error messages
5. Test in different browsers
