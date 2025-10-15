# Performance and CRT Fixes

## Issues Fixed

### 1. Automatic Shader Disabling Due to FPS Drops
**Problem**: The shader system was automatically reducing quality or disabling effects when FPS dropped below certain thresholds, making it difficult to test effects.

**Solution**: 
- Added toggle control for auto-performance adjustment in shader debug UI
- Disabled auto-performance adjustment by default for testing
- Added keyboard shortcut **F6** to quickly toggle auto-performance adjustment
- Added methods to control this setting programmatically

### 2. CRT Sliders Not Working
**Problem**: The CRT effect sliders (curvature, scanlines, phosphor) were not affecting the shader because the uniforms weren't being updated.

**Solution**:
- Fixed the `updateUniforms` method in `ShaderManager` to include all new uniforms:
  - `ditheringIntensity`
  - `pixelSize` 
  - `crtCurvature`
  - `crtScanlines`
  - `crtPhosphor`

## New Controls Added

### Auto-Performance Adjustment Toggle
- **Location**: Shader Debug UI (F4)
- **Control**: Checkbox labeled "Auto Performance Adjustment"
- **Description**: When unchecked, prevents automatic quality reduction due to FPS drops
- **Keyboard Shortcut**: **F6** to toggle quickly

### Updated Keyboard Shortcuts
- **F4**: Toggle Shader Debug Panel
- **F5**: Toggle Shader On/Off
- **F6**: Toggle Auto Performance Adjustment (NEW)
- **1-4**: Load Development Presets
- **Shift + 1-4**: Load Quality Presets

## Technical Changes

### ShaderManager.ts
```typescript
// Added missing uniform updates in updateUniforms method
if (config.ditheringIntensity !== undefined) {
  uniforms.ditheringIntensity.value = config.ditheringIntensity
}
if (config.pixelSize !== undefined) {
  uniforms.pixelSize.value = config.pixelSize
}
if (config.crtCurvature !== undefined) {
  uniforms.crtCurvature.value = config.crtCurvature
}
if (config.crtScanlines !== undefined) {
  uniforms.crtScanlines.value = config.crtScanlines
}
if (config.crtPhosphor !== undefined) {
  uniforms.crtPhosphor.value = config.crtPhosphor
}
```

### Game.ts
```typescript
// Added methods to control auto-performance adjustment
public setShaderAutoPerformanceAdjustment(enabled: boolean): void {
  this.sceneManager.setShaderAutoPerformanceAdjustment(enabled)
}

// Disabled by default for testing
this.setShaderAutoPerformanceAdjustment(false)
```

### ShaderDebugUI.ts
```typescript
// Added auto-performance toggle control
onAutoPerformanceToggle?: (enabled: boolean) => void

// Added F6 keyboard shortcut
if (e.key === 'F6') {
  e.preventDefault()
  const newEnabled = !this.autoPerformanceCheckbox.checked
  this.autoPerformanceCheckbox.checked = newEnabled
  this.callbacks.onAutoPerformanceToggle?.(newEnabled)
}
```

## Usage Instructions

### For Testing CRT Effects
1. Open shader debug panel with **F4**
2. Ensure "Auto Performance Adjustment" is **unchecked** (should be by default)
3. Adjust CRT sliders:
   - **Screen Curvature**: Controls barrel distortion (0.0 = flat, 1.0 = very curved)
   - **Scanlines**: Controls horizontal line intensity (0.0 = none, 1.0 = strong)
   - **Phosphor Glow**: Controls RGB color bleeding (0.0 = none, 1.0 = strong)

### For Testing Pixel Art Effects
1. Try the "Pixel Art Style" preset for immediate results
2. Adjust individual controls:
   - **Dithering**: Controls Bayer matrix dithering (0.0 = none, 1.0 = heavy)
   - **Pixel Size**: Controls pixelation (1.0 = no pixelation, 8.0 = very pixelated)

### Performance Testing
- **Enable auto-performance**: Check the box or press **F6** to let the system automatically adjust quality based on FPS
- **Disable auto-performance**: Uncheck the box or press **F6** to maintain your settings regardless of performance

## Benefits

1. **Consistent Testing Environment**: Effects won't be automatically disabled during testing
2. **Working CRT Effects**: All CRT sliders now properly affect the shader
3. **Quick Toggle**: F6 allows rapid switching between manual and automatic performance modes
4. **Visual Feedback**: Clear UI indication of auto-performance state
5. **Preserved Settings**: Manual settings are maintained when auto-performance is disabled

The shader system now provides full control over performance management and all effects work as intended!