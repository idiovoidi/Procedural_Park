# UI Module

## Overview

The `ui` module manages all user interface components and interactions. It provides a clean separation between UI logic and game logic, making it easy to modify and extend the interface.

**Import Path**: `@ui/*`

**Dependencies**: `@core/*`, `@systems/*`

## Structure

```
ui/
├── components/      # UI components
├── managers/        # UI coordination
└── debug/           # Debug UI
```

## UI Manager (`@ui/managers`)

Coordinates all UI components and manages UI state.

### Key Components

- **UIManager.ts**: Main UI coordinator

### Usage

```typescript
import { UIManager } from '@ui/managers'

const ui = new UIManager()

// Show/hide UI elements
ui.showGallery()
ui.hideSettings()

// Update UI state
ui.updatePhotoCount(count)
ui.showToast('Photo captured!')
```

### UI Manager Responsibilities

- Component lifecycle management
- UI state coordination
- Event handling and delegation
- UI visibility control

## UI Components (`@ui/components`)

Individual UI components with specific responsibilities.

### Gallery Component

Displays captured photos in a grid layout.

**File**: `gallery.ts`

```typescript
import { Gallery } from '@ui/components'

const gallery = new Gallery()

// Add photo to gallery
gallery.addPhoto(photoData)

// Show/hide gallery
gallery.show()
gallery.hide()

// Clear gallery
gallery.clear()
```

**Features**:
- Grid layout of photos
- Photo preview on click
- Photo metadata display (score, rarity, distance)
- Delete photo functionality

### Settings Component

Game settings panel with various options.

**File**: `settings.ts`

```typescript
import { Settings } from '@ui/components'

const settings = new Settings()

// Show/hide settings
settings.show()
settings.hide()

// Get setting values
const volume = settings.getVolume()
const quality = settings.getQuality()

// Listen for changes
settings.onSettingChanged((key, value) => {
  console.log(`${key} changed to ${value}`)
})
```

**Settings**:
- Audio volume
- Graphics quality
- Visual effects toggles
- Camera sensitivity
- Keybindings

### Shortcuts Component

Keyboard shortcuts reference panel.

**File**: `shortcuts.ts`

```typescript
import { Shortcuts } from '@ui/components'

const shortcuts = new Shortcuts()

// Show/hide shortcuts
shortcuts.show()
shortcuts.hide()

// Update shortcuts display
shortcuts.updateBindings(inputManager.getBindings())
```

**Features**:
- Displays all keyboard shortcuts
- Organized by category
- Updates dynamically with keybinding changes

### Mini-Map Component

Displays a top-down view of the game world.

**File**: `mini-map.ts`

```typescript
import { MiniMap } from '@ui/components'

const miniMap = new MiniMap(worldSize)

// Update player position
miniMap.updatePlayerPosition(x, z)

// Add markers
miniMap.addMarker('creature', x, z, color)
miniMap.removeMarker(id)

// Show/hide mini-map
miniMap.show()
miniMap.hide()
```

**Features**:
- Top-down world view
- Player position indicator
- Creature markers
- Structure markers
- Zoom controls

### Toast Component

Temporary notification messages.

**File**: `toast.ts`

```typescript
import { Toast } from '@ui/components'

const toast = new Toast()

// Show toast message
toast.show('Photo captured!', 'success')
toast.show('Connection lost', 'error')
toast.show('Settings saved', 'info')

// Custom duration
toast.show('Message', 'info', 5000) // 5 seconds
```

**Toast Types**:
- `success`: Green, for positive actions
- `error`: Red, for errors
- `info`: Blue, for information
- `warning`: Yellow, for warnings

## Debug UI (`@ui/debug`)

Debug panels and performance monitoring tools.

### Debug Panel

Displays debug information and performance metrics.

**File**: `DebugPanel.ts`

```typescript
import { DebugPanel } from '@ui/debug'

const debug = new DebugPanel()

// Show/hide debug panel
debug.show()
debug.hide()

// Update metrics
debug.updateFPS(fps)
debug.updateMemory(memory)
debug.updateDrawCalls(drawCalls)

// Add custom metrics
debug.addMetric('Creatures', () => creatureCount)
debug.addMetric('Terrain Chunks', () => chunkCount)
```

**Metrics Displayed**:
- FPS (frames per second)
- Memory usage
- Draw calls
- Triangle count
- Active creatures
- Custom metrics

### Shader Debug UI

Shader debugging and parameter tweaking interface.

**File**: `ShaderDebugUI.ts`

```typescript
import { ShaderDebugUI } from '@ui/debug'

const shaderDebug = new ShaderDebugUI(shaderManager)

// Show/hide shader debug
shaderDebug.show()
shaderDebug.hide()

// Add shader controls
shaderDebug.addSlider('pixelSize', 1, 10, 4)
shaderDebug.addSlider('colorDepth', 2, 256, 16)
shaderDebug.addToggle('enabled', true)

// Listen for changes
shaderDebug.onChange((param, value) => {
  shaderManager.updateUniforms('myShader', { [param]: value })
})
```

**Features**:
- Real-time shader parameter tweaking
- Shader enable/disable toggles
- Preset management
- Export/import shader settings

## Best Practices

### Component Initialization

Initialize UI components in the correct order:

```typescript
// 1. Create UI manager
const ui = new UIManager()

// 2. Create components
const gallery = new Gallery()
const settings = new Settings()
const miniMap = new MiniMap(worldSize)

// 3. Register components with manager
ui.registerComponent('gallery', gallery)
ui.registerComponent('settings', settings)
ui.registerComponent('miniMap', miniMap)

// 4. Initialize UI
ui.initialize()
```

### Event Handling

Use event delegation for better performance:

```typescript
// ✅ Good: Event delegation
container.addEventListener('click', (e) => {
  if (e.target.matches('.photo')) {
    handlePhotoClick(e.target)
  }
})

// ❌ Bad: Individual listeners
photos.forEach(photo => {
  photo.addEventListener('click', handlePhotoClick)
})
```

### UI State Management

Keep UI state synchronized with game state:

```typescript
// Listen for game state changes
gameState.on('photoTaken', (photo) => {
  ui.updatePhotoCount(gameState.photoCount)
  gallery.addPhoto(photo)
  toast.show('Photo captured!', 'success')
})
```

### Responsive Design

Make UI responsive to different screen sizes:

```typescript
class UIComponent {
  resize(width: number, height: number) {
    // Adjust layout based on screen size
    if (width < 768) {
      this.enableMobileLayout()
    } else {
      this.enableDesktopLayout()
    }
  }
}
```

### Accessibility

Ensure UI is accessible:

```typescript
// Add ARIA labels
button.setAttribute('aria-label', 'Capture photo')

// Add keyboard navigation
element.setAttribute('tabindex', '0')
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick()
  }
})

// Add focus indicators (CSS)
// button:focus { outline: 2px solid blue; }
```

## Adding New UI Components

### Creating a New Component

1. Create component file: `ui/components/MyComponent.ts`
2. Implement component class
3. Add to barrel export: `ui/components/index.ts`
4. Register with UIManager

Example:
```typescript
// ui/components/MyComponent.ts
export class MyComponent {
  private element: HTMLElement

  constructor() {
    this.element = this.createElement()
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'my-component'
    // Build component structure
    return div
  }

  show() {
    this.element.style.display = 'block'
  }

  hide() {
    this.element.style.display = 'none'
  }

  update(data: any) {
    // Update component with new data
  }
}

// ui/components/index.ts
export { MyComponent } from './MyComponent'
```

### Styling Components

Add styles in `src/style.css`:

```css
.my-component {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  color: white;
}
```

## Common Patterns

### Modal Dialog

```typescript
class Modal {
  show(title: string, content: string) {
    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${title}</h2>
        <p>${content}</p>
        <button class="close">Close</button>
      </div>
    `
    document.body.appendChild(modal)
    
    modal.querySelector('.close')?.addEventListener('click', () => {
      this.hide(modal)
    })
  }

  hide(modal: HTMLElement) {
    modal.remove()
  }
}
```

### Loading Indicator

```typescript
class LoadingIndicator {
  private element: HTMLElement

  show(message: string = 'Loading...') {
    this.element.textContent = message
    this.element.style.display = 'block'
  }

  hide() {
    this.element.style.display = 'none'
  }
}
```

### Progress Bar

```typescript
class ProgressBar {
  private bar: HTMLElement

  setProgress(percent: number) {
    this.bar.style.width = `${percent}%`
  }

  reset() {
    this.setProgress(0)
  }
}
```

## Testing UI Components

### Manual Testing

Test UI components in isolation:

```typescript
// Create test page
const testPage = document.createElement('div')
testPage.id = 'test-page'
document.body.appendChild(testPage)

// Test component
const component = new MyComponent()
testPage.appendChild(component.element)
component.show()
```

### Automated Testing

Use DOM testing libraries:

```typescript
import { screen, fireEvent } from '@testing-library/dom'

test('button click shows modal', () => {
  const button = screen.getByRole('button', { name: 'Open' })
  fireEvent.click(button)
  
  const modal = screen.getByRole('dialog')
  expect(modal).toBeVisible()
})
```
