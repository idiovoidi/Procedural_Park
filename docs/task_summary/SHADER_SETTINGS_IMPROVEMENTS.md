# Shader Settings with Pixel Art & CRT Effects

## New Visual Effects Added

### 1. Pixel Art Style Effects
- **Dithering**: Bayer matrix dithering for authentic pixel art texture
- **Pixelation**: Adjustable pixel size for retro game aesthetics
- **Color Reduction**: Works with existing posterization for limited color palettes

### 2. CRT Monitor Effects
- **Screen Curvature**: Barrel distortion to simulate curved CRT screens
- **Scanlines**: Horizontal lines like old monitors and TVs
- **Phosphor Glow**: RGB phosphor simulation with color bleeding effects

## Fixed Issues

### 1. Broken Sliders
- **Problem**: Sliders were not properly synchronized with their values
- **Solution**: 
  - Added proper event handling for both `input` and `change` events
  - Implemented bidirectional synchronization between sliders and number inputs
  - Added proper value clamping and validation

### 2. Manual Number Input
- **Problem**: No way to manually enter precise values
- **Solution**:
  - Added number input fields next to each slider
  - Inputs are synchronized with sliders in real-time
  - Values are automatically clamped to valid ranges
  - Enter key applies changes immediately

### 3. Import/Export Functionality
- **Problem**: No way to save and load shader configurations
- **Solution**:
  - Added "Export Settings" button that saves current configuration as JSON
  - Added "Import Settings" button that loads configuration from JSON file
  - Includes validation to ensure imported files are valid
  - Shows success/error notifications for user feedback

## New Features

### Enhanced UI Controls
- **Slider-Input Pairs**: Each parameter now has both a slider and a number input
- **Real-time Sync**: Changes in either control immediately update the other
- **Value Validation**: All inputs are validated and clamped to acceptable ranges
- **Better Responsiveness**: Multiple event handlers ensure smooth interaction

### New Effect Categories
- **🎮 Pixel Art Effects**: Dithering and pixelation controls
- **📺 CRT Monitor Effects**: Screen curvature, scanlines, and phosphor glow
- **🎬 Grit Effects**: Enhanced film grain, dirt, and vintage camera effects

### New Presets
- **Pixel Art Style**: Heavy dithering with large pixels for retro game look
- **Retro CRT Monitor**: Authentic old monitor simulation with all CRT effects
- **Clean**: No effects for comparison and performance testing

### Settings Management
- **Export**: Save your current shader settings to a JSON file
- **Import**: Load previously saved settings from a JSON file
- **Validation**: Imported files are validated for correct format and required properties
- **Notifications**: Visual feedback for successful/failed operations

### Improved Accessibility
- **Keyboard Support**: Enter key applies number input changes
- **Visual Feedback**: Clear notifications for all operations
- **Error Handling**: Graceful handling of invalid inputs and file errors

## Usage

### Basic Controls
1. **Sliders**: Drag to adjust values with visual feedback
2. **Number Inputs**: Type exact values for precise control
3. **Presets**: Use dropdown to quickly apply predefined configurations

### New Effect Controls

#### Pixel Art Effects
- **Dithering (0.0-1.0)**: Controls Bayer matrix dithering intensity
- **Pixel Size (1.0-8.0)**: Adjusts pixelation level (1.0 = no pixelation)

#### CRT Monitor Effects
- **Screen Curvature (0.0-1.0)**: Barrel distortion like old CRT monitors
- **Scanlines (0.0-1.0)**: Horizontal line intensity
- **Phosphor Glow (0.0-1.0)**: RGB phosphor simulation with color bleeding

### Preset Styles
- **Inscryption**: Original balanced style
- **Pixel Art Style**: Heavy dithering + large pixels for retro games
- **Retro CRT Monitor**: Full CRT simulation with curvature and scanlines
- **Dramatic**: High contrast with intense effects
- **Subtle**: Minimal effects for clean look

### Saving Your Settings
1. Adjust shader parameters to your liking
2. Click "Export Settings" button
3. File will be automatically downloaded with timestamp

### Loading Saved Settings
1. Click "Import Settings" button
2. Select your previously saved JSON file
3. Settings will be applied immediately with confirmation

### Quick Access
- Press **F4** to toggle the shader debug panel
- Press **F5** to quickly toggle shader on/off
- Use **1-4** keys for development presets (including new Pixel Art and CRT styles)
- Use **Shift + 1-4** for quality presets
- Click **🎨 Shader Settings** in main settings panel

## Technical Improvements

### Event Handling
```typescript
// Improved slider-input synchronization
private setupSliderInputPair(
  slider: HTMLInputElement, 
  input: HTMLInputElement, 
  configKey: keyof ShaderConfig,
  onChange: (value: number) => void,
  isInteger: boolean = false
): void {
  // Handles both slider and input changes with proper validation
}
```

### File Operations
```typescript
// Export current settings
private exportSettings(): void {
  const exportData = {
    name: `Shader Settings ${new Date().toLocaleDateString()}`,
    timestamp: new Date().toISOString(),
    config: { ...this.currentConfig }
  }
  // Creates downloadable JSON file
}

// Import settings with validation
private async importSettings(file: File): Promise<void> {
  // Validates file format and applies settings safely
}
```

### Error Handling
- Comprehensive validation for imported files
- Graceful fallbacks for invalid inputs
- User-friendly error messages
- Automatic value clamping

## Benefits

1. **Better User Experience**: Smooth, responsive controls with multiple input methods
2. **Precision Control**: Exact numeric input for fine-tuning
3. **Settings Persistence**: Save and share your favorite configurations
4. **Robust Error Handling**: Graceful handling of edge cases and invalid inputs
5. **Professional UI**: Clean, intuitive interface with proper feedback
6. **Authentic Retro Effects**: True-to-life pixel art and CRT monitor simulation
7. **Performance Optimized**: Efficient shader code with quality presets for different hardware

## Example Configurations

### Pixel Art Style
```json
{
  "ditheringIntensity": 0.9,
  "pixelSize": 4.0,
  "colorSteps": 4,
  "crtCurvature": 0.0,
  "crtScanlines": 0.0
}
```

### Retro CRT Monitor
```json
{
  "crtCurvature": 0.8,
  "crtScanlines": 0.8,
  "crtPhosphor": 0.9,
  "ditheringIntensity": 0.2,
  "pixelSize": 1.2
}
```

### Inscryption Style (Enhanced)
```json
{
  "luminanceThreshold": 0.3,
  "colorSteps": 8,
  "grittiness": 0.6,
  "ditheringIntensity": 0.3,
  "crtCurvature": 0.2
}
```

The shader system now provides authentic retro visual effects with professional-grade controls, allowing you to create anything from clean pixel art to gritty CRT monitor aesthetics.