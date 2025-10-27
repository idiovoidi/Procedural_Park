# Creature Card Export - Troubleshooting

## Issue: No download appears

### Check Browser Console
Open the browser console (F12) and look for these messages when pressing E:

1. `Exporting creature card for: [CreatureName]` - Confirms export started
2. `Creature bounds - center: [...], size: [...], maxDim: [...]` - Shows creature was found
3. `Canvas size: 512x512` - Confirms renderer is working
4. `Generated dataURL length: [number] characters` - Confirms image was generated
5. `Stored metadata in localStorage: creature-card-[name]-[timestamp]` - Confirms metadata saved
6. `Downloading creature card: creature-card-[name].png` - Confirms download triggered

### Common Issues

**No creature in view**
- Make sure you're looking at a creature when pressing E
- The creature must be visible and not occluded
- Try getting closer to the creature

**Browser blocking downloads**
- Check if your browser is blocking automatic downloads
- Look for a download blocked notification in the address bar
- Allow downloads from the site in browser settings

**Canvas rendering issue**
- If dataURL length is very short (< 1000), the canvas didn't render
- Check browser console for WebGL errors
- Try refreshing the page

**Download not appearing in folder**
- Check your browser's Downloads folder
- Check browser's download history (Ctrl+J in Chrome)
- The file should be named: `creature-card-[CreatureName].png`

### Testing the Feature

1. Start the game and find a creature
2. Open browser console (F12)
3. Press E key
4. Watch console for the messages listed above
5. Check browser downloads (Ctrl+J)

### Manual Testing

You can test the export manually in the console:

```javascript
// Get the game instance
const game = window.game

// Get the photo system
const photoSystem = game.systems.photo

// Get all creatures
const creatures = game.systems.creatures.getAllCreatures()

// Export the first creature
if (creatures.length > 0) {
  await photoSystem.exportCreatureCard(
    creatures,
    game.systems.camera.camera,
    game.systems.scene.scene,
    1337 // world seed
  )
}
```

### Verify Metadata Storage

Check if metadata is being stored:

```javascript
// List all creature cards in localStorage
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key?.startsWith('creature-card-')) {
    console.log(key)
  }
}
```

### Browser Compatibility

The feature requires:
- WebGL 2.0 support
- Canvas API with `toDataURL()` support
- Download attribute support on `<a>` tags
- localStorage support

All modern browsers (Chrome 90+, Firefox 88+, Safari 14+) support these features.

### Still Not Working?

1. Try a different browser
2. Clear browser cache and localStorage
3. Check browser console for any errors
4. Ensure you're running the latest build
5. Report the issue with console logs
