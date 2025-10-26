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

```
src/
├── multiplayer/          # WebRTC multiplayer system
│   ├── types.ts         # Shared types and interfaces
│   ├── WebRTCPeer.ts    # WebRTC connection wrapper
│   ├── StateSync.ts     # Binary state synchronization
│   ├── PeerAvatar.ts    # Peer rendering in 3D scene
│   ├── ConnectionUI.ts  # Connection UI components
│   └── WebRTCMultiplayer.ts  # Main multiplayer coordinator
├── shaders/             # Custom GLSL shaders
├── types/               # TypeScript type definitions
├── game.ts              # Main game logic
├── scene.ts             # Scene management
├── camera.ts            # Camera controller
├── creatures.ts         # Creature behavior
├── photo-system.ts      # Photography mechanics
└── ui.ts                # User interface
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier

## Documentation

- [Multiplayer User Guide](docs/multiplayer-guide.md) - How to connect and play with friends
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
