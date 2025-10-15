# Shader Debug Guide

## Testing CRT and Pixel Art Effects

### Quick Test Steps:

1. **Open the shader debug panel** (F4)
2. **Disable auto-performance adjustment** (should be off by default)
3. **Look for debug console logs** when adjusting sliders
4. **Look for visual color tints** that indicate uniforms are working:
   - **Red tint**: Dithering is active (>0.1)
   - **Green tint**: CRT curvature is active (>0.1) 
   - **Blue tint**: Pixelation is active (>1.5)

### Test Each Effect:

#### Dithering Test:
- Set "Dithering" slider to 0.8
- Should see: Red color tint + pixelated dithering pattern
- Console should log: "Updating CRT/Pixel uniforms"

#### Pixelation Test:
- Set "Pixel Size" slider to 3.0
- Should see: Blue color tint + blocky pixelated image
- Console should log: "Updating CRT/Pixel uniforms"



#### CRT Scanlines Test:
- Set "Scanlines" slider to 0.8
- Should see: Horizontal dark lines across the screen
- Console should log: "Updating CRT/Pixel uniforms"

#### CRT Phosphor Test:
- Set "Phosphor Glow" slider to 0.8
- Should see: Color bleeding and RGB separation effects
- Console should log: "Updating CRT/Pixel uniforms"

### Troubleshooting:

#### If no visual changes occur:
1. Check browser console for errors
2. Look for "Updating CRT/Pixel uniforms" logs
3. Try the preset buttons: "Pixel Art Style" or "Retro CRT Monitor"
4. Ensure shader is enabled (checkbox at top)

#### If console shows uniform updates but no visual change:
- The shader might not be recompiling properly
- Try refreshing the page
- Check for WebGL errors in console

#### If no console logs appear:
- The UI callbacks might not be connected properly
- Check that sliders are actually calling the update functions

### Expected Console Output:
```
Initializing shader uniforms with config: {enabled: true, ...}
Updating CRT/Pixel uniforms: {ditheringIntensity: 0.8, pixelSize: 1, crtScanlines: 0, crtPhosphor: 0}
```

### Presets to Try:
- **"Pixel Art Style"**: Heavy dithering + large pixels
- **"Retro CRT Monitor"**: Full CRT simulation
- **"Clean"**: No effects (for comparison)

### Debug Color Tints:
The shader now adds subtle color tints to help verify uniforms are working:
- **Slight red**: Dithering > 0.1
- **Slight blue**: Pixel size > 1.5

These tints will be removed once we confirm the effects are working properly.