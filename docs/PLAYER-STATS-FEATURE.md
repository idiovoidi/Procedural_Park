# Player Stats & Inventory Feature

## Overview

The Player Stats page provides a comprehensive view of player progress, achievements, and inventory. It features a 3D rotating avatar preview and displays collected items and statistics.

## Features

### 1. Avatar Preview
- **3D Rotating Model**: Interactive 3D avatar that rotates continuously
- **Cyan Glowing Effect**: Distinctive visual style matching the multiplayer peer avatar
- **Real-time Rendering**: Uses Three.js for smooth 60fps animation
- **Lighting Effects**: Ambient, directional, and rim lighting for depth

### 2. Quick Stats Panel
Displays essential player metrics:
- 📸 **Photos**: Total number of photos taken
- ⭐ **Total Score**: Cumulative score from all photos
- 🏆 **Best Score**: Highest single photo score
- 🦎 **Discovered**: Number of unique creatures photographed
- ⏱️ **Play Time**: Total time spent playing (hours and minutes)

### 3. Achievements Panel
Shows creature photography progress by rarity tier:
- **Common** (Gray): Basic creatures
- **Uncommon** (Green): Less common creatures
- **Rare** (Blue): Rare creatures
- **Epic** (Purple): Very rare creatures
- **Legendary** (Gold): Extremely rare creatures

Each tier displays the count of creatures photographed at that rarity level.

### 4. Inventory System
Grid-based inventory displaying collectible items:
- **Camera**: Your photography tool (Legendary rarity)
- **Photos**: Collection of taken photos
- **Rarity Badges**: Earned by photographing creatures of each rarity tier
  - 👑 Legendary Badge
  - 💎 Epic Badge
  - 💠 Rare Badge

**Inventory Features**:
- Color-coded borders by rarity
- Quantity indicators for stackable items
- Hover effects with tooltips
- Responsive grid layout

## Usage

### Opening the Player Stats
- **Keyboard**: Press `I` key
- **Mouse**: Click the 👤 button in the top-right HUD

### Navigation
- **Close**: Click the ✕ button or click outside the modal
- **Scroll**: Use mouse wheel to scroll through content if needed

## Technical Implementation

### Components
- **PlayerStats** (`src/ui/components/player-stats.ts`): Main component
  - Manages 3D avatar rendering
  - Handles stats display and updates
  - Manages inventory grid

### Integration Points
- **UIManager**: Coordinates with other UI components
- **Game**: Provides player progress data
- **WorldStateManager**: Tracks persistent player statistics
- **InputManager**: Handles keyboard shortcut (I key)

### Data Flow
```
Game.getPlayerProgress()
  ↓
UIManager.updatePlayerStats()
  ↓
PlayerStats.updateStats()
  ↓
DOM Update
```

### Avatar Rendering
- Uses separate Three.js scene for isolated rendering
- Canvas size: 268x268 pixels
- Camera FOV: 50 degrees
- Animation loop runs only when modal is visible
- Automatic cleanup on modal close

## Styling

### Color Scheme
- **Background**: Dark gradient (#1a1a2e → #16213e)
- **Accent**: Green (#4ade80)
- **Borders**: Semi-transparent green
- **Text**: Light gray (#e5e7eb)

### Rarity Colors
- Common: #9ca3af (Gray)
- Uncommon: #4ade80 (Green)
- Rare: #60a5fa (Blue)
- Epic: #a78bfa (Purple)
- Legendary: #fbbf24 (Gold)

## Future Enhancements

Potential additions to the system:
1. **Customizable Avatars**: Allow players to customize their avatar appearance
2. **More Collectibles**: Add items like binoculars, field guides, etc.
3. **Achievement System**: Unlock badges for specific accomplishments
4. **Statistics Graphs**: Visual charts showing progress over time
5. **Creature Encyclopedia**: Detailed info on discovered creatures
6. **Equipment System**: Upgradeable camera lenses and accessories
7. **Social Features**: Compare stats with other players

## Performance Considerations

- Avatar rendering is paused when modal is closed
- Three.js resources are properly disposed on cleanup
- Inventory grid uses CSS Grid for efficient layout
- Stats update only when modal is opened
- Minimal memory footprint (~2MB for avatar scene)

## Accessibility

- Keyboard navigation support (I key to toggle)
- Clear visual hierarchy
- High contrast text
- Hover states for interactive elements
- Descriptive tooltips on inventory items
