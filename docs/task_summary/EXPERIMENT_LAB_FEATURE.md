# Experiment Lab Feature

## Overview

Added an experimentation room where you can constantly randomize creature parameters for playing around and experimenting with different creature designs.

## What Was Added

### 1. Experiment Lab Structure (`src/park-structures.ts`)

- **Glass Dome Lab**: A futuristic glass dome structure with:
  - Transparent dome roof
  - Central pedestal for the creature
  - Glowing cyan ring around the pedestal
  - 6 support pillars with lights
  - Sci-fi aesthetic with metallic materials
  - **Dynamic Sign**: Displays the current creature's name on the outside with glowing cyan text
- **Location**: Positioned at coordinates (-35, 0, -20) away from the main path
- **Method**: `buildExperimentLab()` - Creates the lab structure
- **Method**: `getLabPosition()` - Returns the lab's position for creature spawning (Y=3.5 for floating effect)
- **Method**: `updateLabSign(creatureName)` - Updates the sign text with the creature's name

### 2. Experiment Creature System (`src/game.ts`)

- **New Property**: `experimentCreature` - A special creature instance in the lab
- **Method**: `spawnExperimentCreature()` - Creates the initial creature in the lab
- **Method**: `randomizeExperimentCreature()` - Removes old creature and spawns a new random one
- **Integration**:
  - Creature updates in the game loop
  - Included in photo system
  - Shows special "🧬 EXPERIMENT" label in creature info
  - Persists through ride restarts (doesn't get cleared)

### 3. New Creature Spawning Function (`src/creatures.ts`)

- **Function**: `spawnCreatureAt(scene, position, rand)`
  - Spawns a creature at an exact position
  - Similar to `spawnCreatureNearPath` but with precise positioning
  - Used for placing the experiment creature on the lab pedestal

### 4. Controls & UI

- **Keyboard Shortcut**: Press **X** to randomize the lab creature
- **Help Text**: Updated to show "🧬 X: Randomize Lab Creature"
- **Toast Notification**: Shows "🧬 Creature Randomized!" when you press X
- **Creature Info**: Shows special label when viewing the experiment creature

## How to Use

1. **Start the game** - The lab will be built automatically with an initial random creature
2. **Navigate to the lab** - Located at coordinates (-35, 0, -20), away from the main path
3. **Press X** - Randomizes the creature with completely new parameters:
   - Random archetype (terrestrial, aerial, aquatic, ethereal, crystalline)
   - Random body type, size, and shape
   - Random features (eyes, limbs, wings, tails, horns, ears, spines, etc.)
   - Random colors and patterns
   - Random temperament and behaviors
4. **Take photos** - The experiment creature can be photographed like any other creature
5. **Experiment freely** - Press X as many times as you want to see different combinations

## Technical Details

- Uses random seed generation for reproducible creatures
- Creature is positioned at Y=3.5 to float higher in the dome
- Properly integrated with all game systems (rendering, updates, photos, info display)
- Lab structure has animated glowing elements
- Creature persists through ride restarts but can be randomized anytime
- **Canvas Texture Text**: Used for rendering the creature name on the lab sign
  - Text rendered to canvas with glowing cyan effect on dark background
  - Updates automatically when creature is randomized
  - Stays flat on the sign (doesn't rotate with camera)
  - High contrast for easy reading

## Future Enhancement Ideas

- Add UI panel to manually adjust specific creature parameters
- Save/load favorite creature designs
- Export creature DNA codes to share with others
- Add mutation slider to make small vs large changes
- Show creature parameter breakdown in UI
