# CRT Curvature Effect Removal

## Changes Made

### 1. **Shader Code (InscryptionShader.ts)**
- ✅ Removed `crtDistortion()` function
- ✅ Removed CRT curvature application in main function
- ✅ Simplified shader to use original UV coordinates for all effects
- ✅ Removed CRT curvature debug tint (green tint)

### 2. **UI Controls (ShaderDebugUI.ts)**
- ✅ Removed "Screen Curvature" slider and number input
- ✅ Removed CRT curvature control elements from class
- ✅ Removed CRT curvature event handlers and callbacks
- ✅ Removed CRT curvature from UI update methods

### 3. **Shader Manager (ShaderManager.ts)**
- ✅ Removed CRT curvature uniform updates
- ✅ Removed CRT curvature from debug logging
- ✅ Kept the uniform definition for compatibility

### 4. **Configuration (InscryptionShaderConfig.ts)**
- ✅ Set default CRT curvature to 0.0
- ✅ Updated all presets to have curvature = 0.0
- ✅ Updated "Retro CRT Monitor" preset description

### 5. **Documentation**
- ✅ Updated debug guide to remove curvature tests
- ✅ Removed curvature from expected console output
- ✅ Removed green debug tint documentation

## Remaining CRT Effects

The following CRT effects are still available and working:

### 📺 **CRT Scanlines**
- **Control**: "Scanlines" slider (0.0 - 1.0)
- **Effect**: Horizontal dark lines across the screen
- **Usage**: Simulates the horizontal scan lines of old CRT monitors

### 📺 **CRT Phosphor Glow**
- **Control**: "Phosphor Glow" slider (0.0 - 1.0)  
- **Effect**: RGB color separation and bleeding
- **Usage**: Simulates the phosphor coating on CRT screens

## Benefits of Removal

1. **Simplified Shader**: Removed complex barrel distortion calculations
2. **Better Performance**: Less GPU computation required
3. **Cleaner UI**: Fewer confusing controls
4. **Focus on Working Effects**: Concentrate on scanlines and phosphor glow
5. **No Edge Cases**: Eliminated issues with screen bounds and black borders

## Current Effect Categories

### 🎮 **Pixel Art Effects**
- ✅ Dithering (Bayer matrix)
- ✅ Pixelation (adjustable pixel size)

### 📺 **CRT Monitor Effects** 
- ✅ Scanlines (horizontal lines)
- ✅ Phosphor Glow (RGB color bleeding)
- ❌ ~~Screen Curvature~~ (removed)

### 🎬 **Grit Effects**
- ✅ Film Grain
- ✅ Dirt/Dust Texture  
- ✅ Vignette
- ✅ Chromatic Aberration

## Testing the Remaining Effects

### Scanlines Test:
```
1. Set "Scanlines" slider to 0.8
2. Should see horizontal dark lines
3. Console: "Updating CRT/Pixel uniforms"
```

### Phosphor Glow Test:
```
1. Set "Phosphor Glow" slider to 0.8  
2. Should see RGB color separation
3. Console: "Updating CRT/Pixel uniforms"
```

### Pixel Art Test:
```
1. Try "Pixel Art Style" preset
2. Should see heavy dithering + large pixels
3. Blue debug tint when pixel size > 1.5
```

The shader system is now simpler and more focused on the effects that work reliably!