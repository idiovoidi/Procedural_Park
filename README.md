# 🦁 AI Snap - Wildlife Photography Game

A 3D wildlife photography game where you explore a procedurally generated safari park, discover unique creatures, and capture stunning photos. Built with Three.js, TypeScript, and modern web technologies.

![AI Snap](https://img.shields.io/badge/Status-In%20Development-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.179.1-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

### 🎮 Core Gameplay
- **Procedural Wildlife**: 60+ unique creatures with varied anatomies, behaviors, and rarities
- **Photography System**: Score-based creature photography with distance, framing, and rarity calculations
- **Dual Camera Modes**: Ride mode (automated path) and free roam mode (WASD controls)
- **Creature Collection**: Build your collection by photographing different species

### 🍖 Interaction Systems
- **Feeding Mechanics**: Use different food types to interact with creatures
- **Currency Economy**: Earn Safari Coins from photos and feeding
- **Food Store**: Purchase food items to stock your inventory
- **Creature Reactions**: Creatures respond differently to various foods

### 🌍 World & Environment
- **Biome System**: Forest, meadow, rocky, wetland, crystal cave, and floating islands
- **Procedural Terrain**: Noise-based generation with smooth biome transitions
- **Park Structures**: Main gate, ranger station, experiment lab, food store
- **Dynamic Lighting**: Day/night toggle with atmospheric effects

### 🎨 Visual Effects
- **Post-Processing Pipeline**: CRT simulation, film grain, chromatic aberration
- **Retro Aesthetics**: Pixel-art style options with customizable shaders
- **Performance Monitoring**: Auto-adjustment for optimal frame rates

### 👥 Multiplayer
- **WebRTC P2P**: Serverless peer-to-peer connections
- **Shared Exploration**: See other players in real-time
- **Photo Events**: Share photography moments with peers

### 💾 Progression
- **Save/Load System**: Multiple save slots with export/import
- **Player Stats**: Track photos, discoveries, and achievements
- **Transaction History**: View currency earnings and spending

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser with WebGL 2.0 support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-snap.git
cd ai-snap

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will open at `http://localhost:3000`

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## 🎮 Controls

### Camera
- **C** - Toggle camera mode (Ride/Free Roam)
- **WASD** - Move camera (Free Roam mode)
- **Mouse** - Look around (Free Roam mode)
- **Shift** - Sprint
- **Space** - Jump
- **Arrow Keys** - Look around (alternative)

### Photography
- **T** - Take photo
- **E** - Export creature card
- **G** - Toggle gallery

### Interaction
- **F** - Feed nearest creature
- **B** - Toggle food inventory
- **O** - Open food store

### UI
- **I** - Player stats
- **K** - Creature collection
- **M** - Multiplayer menu
- **H** - Keyboard shortcuts
- **Escape** - Settings menu
- **P** - Pause game

### Other
- **R** - Restart ride
- **X** - Randomize creatures
- **V** - Toggle visual effects
- **N** - Toggle day/night
- **;** - Toggle video recording (30s max)

## 📁 Project Structure

```
ai-snap/
├── src/
│   ├── core/                 # Core utilities and constants
│   │   ├── constants/        # Game configuration
│   │   ├── types/            # Shared TypeScript types
│   │   └── utils/            # Helper functions
│   ├── game/                 # Main game logic
│   │   ├── Game.ts           # Main game class
│   │   ├── GameLoop.ts       # Update loop
│   │   ├── SystemsCoordinator.ts  # System initialization
│   │   └── InputHandler.ts   # Input routing
│   ├── systems/              # Game systems
│   │   ├── camera/           # Camera controller
│   │   ├── creatures/        # Creature generation & AI
│   │   ├── photo/            # Photography scoring
│   │   ├── audio/            # Audio management
│   │   ├── terrain/          # Terrain generation
│   │   ├── food/             # Feeding mechanics
│   │   ├── currency/         # Economy system
│   │   ├── input/            # Input management
│   │   └── state/            # State management
│   ├── rendering/            # Rendering systems
│   │   ├── scene/            # Scene management
│   │   ├── shaders/          # Custom shaders
│   │   └── textures/         # Texture management
│   ├── ui/                   # User interface
│   │   ├── components/       # UI components
│   │   └── managers/         # UI coordination
│   ├── multiplayer/          # Multiplayer systems
│   │   ├── webrtc/           # WebRTC implementation
│   │   ├── state-sync/       # State synchronization
│   │   └── peer-avatar/      # Peer rendering
│   └── main.ts               # Entry point
├── docs/                     # Documentation
│   ├── CODEBASE_GOALS.md     # Project vision & goals
│   ├── ARCHITECTURE.md       # Technical architecture
│   └── My_Docs/              # Development notes
├── public/                   # Static assets
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🏗️ Architecture

### Core Principles
- **Modular Systems**: Self-contained, loosely coupled systems
- **Event-Driven**: Systems communicate via callbacks and events
- **Configuration-Driven**: All constants in centralized config
- **Type-Safe**: TypeScript strict mode throughout

### Key Systems
- **Game Loop**: Coordinates all system updates at 60 FPS
- **State Manager**: Centralized state with flow and subsystem states
- **Input Manager**: Priority-based input handling with context awareness
- **Scene Manager**: Three.js scene graph and rendering pipeline
- **Creature Manager**: Procedural generation and behavior AI
- **Currency Manager**: Economy with transactions and rewards

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.

## 🎨 Customization

### Game Configuration
Edit `src/core/constants/game-config.ts`:

```typescript
export const GAME_CONFIG = {
  CREATURE_COUNT: 60,           // Number of creatures
  WORLD_SEED: 1337,             // Procedural generation seed
  CAMERA_SPEED_DEFAULT: 0.025,  // Camera movement speed
  PHOTO_SCORE_EXCELLENT: 80,    // Score threshold
  // ... more settings
}
```

### Adding New Creatures
1. Define anatomy in `src/systems/creatures/creature-generator.ts`
2. Add behavior patterns in `src/systems/creatures/creature-behaviour.ts`
3. Configure rarity in creature generation logic

### Creating New Food Items
1. Add to `src/systems/food/food-data.ts`:
```typescript
export const FOOD_ITEMS = {
  newFood: {
    id: 'newFood',
    name: 'New Food',
    icon: '🍎',
    effectiveness: { /* archetype preferences */ },
    // ...
  }
}
```
2. Add to store in `src/systems/food/store-data.ts`

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
npm run lint         # Lint TypeScript files
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
```

### Debug Tools
- **F12**: Toggle debug panel (FPS, memory, system status)
- **Console**: System events and detailed logging
- **State Panel**: View state machine transitions (dev mode)

### Performance Tips
- Use object pools for frequently created objects
- Leverage memoization for expensive calculations
- Monitor debug panel for performance bottlenecks
- Enable auto-performance adjustment in shader settings

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code style**: Use existing patterns and naming conventions
4. **Test thoroughly**: Manual testing in development mode
5. **Update documentation**: Add/update relevant docs
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

See [CODEBASE_GOALS.md](docs/CODEBASE_GOALS.md) for detailed contribution guidelines.

## 📝 Roadmap

### Current Version (v0.1.0)
- ✅ Core photography gameplay
- ✅ Procedural creature generation
- ✅ Feeding mechanics
- ✅ Currency economy
- ✅ Food store
- ✅ Multiplayer support
- ✅ Save/load system

### Upcoming Features
- 🎯 Achievement system
- 🎯 Daily challenges
- 🎯 Weather system
- 🎯 Time of day cycle
- 🎯 Creature breeding
- 🎯 Park customization

### Future Considerations
- 💭 VR support
- 💭 Mobile version
- 💭 Mod support
- 💭 Social features

## 🐛 Known Issues

- WebRTC multiplayer may have connection issues on some networks
- Safari has limited WebRTC support
- Performance may vary on older hardware

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **Vite** - Build tool and dev server
- **simple-peer** - WebRTC wrapper
- **postprocessing** - Visual effects pipeline

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-snap/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-snap/discussions)

---

Made with ❤️ and TypeScript
