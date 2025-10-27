# AI Snap

A 3D wildlife photography game built with Three.js and TypeScript. Explore a virtual safari park, observe creatures in their natural habitat, and capture stunning photos. Now with peer-to-peer multiplayer support!

## Features

- **Immersive 3D Environment**: Explore a detailed safari park with dynamic terrain and vegetation
- **Wildlife Photography**: Capture photos of various creatures with a realistic camera system
- **Multiple Camera Modes**: Switch between ride mode and free exploration
- **Post-Processing Effects**: Customizable shader effects for retro and pixel-art styles
- **Peer-to-Peer Multiplayer**: Connect with a friend and explore together in real-time (no server required!)

## Multiplayer

The game features serverless peer-to-peer multiplayer using WebRTC. Connect with a friend directly through your browsers without needing any dedicated servers. Perfect for static hosting on GitHub Pages or Vercel!

### Quick Start

1. **Host**: Click "Multiplayer" → "Create Session" → Copy the offer code and send it to your friend
2. **Guest**: Paste the offer code → Copy the answer code and send it back to the host
3. **Host**: Paste the answer code → You're connected!

See the [Multiplayer User Guide](docs/multiplayer-guide.md) for detailed instructions.

### Multiplayer Features

- Real-time position and camera synchronization
- See where your friend is looking with visual indicators
- Photo notifications when your friend takes a picture
- Low bandwidth usage (~3-4 KB/s)
- Works on static hosting platforms

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-snap

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

## Development

### Project Structure

The codebase is organized into modular domains with clear responsibilities and dependencies:

```
src/
├── core/                # Core utilities and constants (no dependencies)
│   ├── constants/       # Game configuration, biome config, physics constants
│   ├── utils/           # Math utilities, object pooling, random utilities
│   └── types/           # Shared type definitions
├── systems/             # Game systems (depend on core)
│   ├── creatures/       # Creature generation, behavior, and pooling
│   ├── terrain/         # Terrain and biome generation
│   ├── audio/           # Audio management and sound generation
│   ├── camera/          # Camera control (ride + free roam)
│   ├── photo/           # Photography system and scoring
│   ├── input/           # Centralized input handling
│   └── state/           # State management and synchronization
├── rendering/           # Rendering systems (depend on core + systems)
│   ├── scene/           # 3D scene management
│   ├── shaders/         # Custom GLSL shaders
│   ├── visual-effects/  # Post-processing effects (CRT, film grain, etc.)
│   └── textures/        # Texture generation
├── ui/                  # User interface (depend on core + systems)
│   ├── components/      # UI components (gallery, settings, mini-map, etc.)
│   ├── managers/        # UI coordination
│   └── debug/           # Debug panels and performance monitoring
├── multiplayer/         # Multiplayer systems (depend on core + systems)
│   ├── webrtc/          # WebRTC peer connections
│   ├── state-sync/      # Binary state synchronization
│   └── peer-avatar/     # Peer rendering in 3D scene
├── game/                # Game orchestration (can depend on anything)
│   ├── Game.ts          # Main game class
│   ├── GameLoop.ts      # Game loop implementation
│   └── managers/        # High-level system managers
└── main.ts              # Application entry point
```

See [docs/structure.md](docs/structure.md) for detailed module documentation.

### Module System

The codebase uses path aliases for clean imports:

```typescript
// Import from core utilities
import { GAME_CONFIG } from '@core/constants'
import { getPooledVector3 } from '@core/utils'

// Import from game systems
import { CreatureManager } from '@systems/creatures'
import { TerrainSystem } from '@systems/terrain'
import { CameraController } from '@systems/camera'

// Import from rendering
import { SceneManager } from '@rendering/scene'
import { ShaderManager } from '@rendering/shaders'

// Import from UI
import { UIManager } from '@ui/managers'

// Import from multiplayer
import { WebRTCPeer } from '@multiplayer/webrtc'
import { StateSync } from '@multiplayer/state-sync'
```

Each module exports its public API through barrel exports (`index.ts`), making it easy to import only what you need.

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier

## Documentation

- [Project Structure](docs/structure.md) - Detailed module organization and architecture
- [Migration Guide](docs/migration-guide.md) - Guide for navigating the modular structure
- [Multiplayer User Guide](docs/multiplayer-guide.md) - How to connect and play with friends
- [Input Manager](docs/input-manager.md) - Centralized input handling system
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Architecture](docs/architecture.md) - Technical architecture and design decisions

## Technologies

- **Three.js** - 3D graphics rendering
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **WebRTC** - Peer-to-peer multiplayer
- **Simple Peer** - Simplified WebRTC API
- **Postprocessing** - Visual effects and shaders

## Deployment

The game can be deployed to any static hosting platform:

### GitHub Pages

```bash
npm run build
# Deploy the dist/ folder to GitHub Pages
```

### Vercel

```bash
# Connect your repository to Vercel
# Vercel will automatically build and deploy
```

The multiplayer system works seamlessly on static hosting platforms without requiring any server-side code.

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (limited WebRTC support)

For the best multiplayer experience, use Chrome or Edge.

## License

[Your License Here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
