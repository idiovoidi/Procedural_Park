# Technology Stack

## Core Technologies

- **TypeScript 5.8.3** - Strict mode enabled, ES2022 target
- **Three.js 0.179.1** - 3D graphics and WebGL rendering
- **Vite 7.1.0** - Build tool and dev server with HMR
- **Vanilla JavaScript** - No frontend framework, custom game engine architecture

## Key Libraries

- **postprocessing 6.37.8** - Visual effects pipeline
- **simple-peer 9.11.1** - WebRTC peer-to-peer connections
- **Web Audio API** - Procedural audio generation

## Development Tools

- **ESLint** - TypeScript linting with recommended rules
- **Prettier** - Code formatting
- **TypeScript Compiler** - Type checking with strict mode

## Build Configuration

### Vite Settings
- Base path: `/Procedural_Park/` (GitHub Pages deployment)
- Manual chunks: Three.js and postprocessing separated
- Tree shaking enabled with console.log removal in production
- Terser minification with no sourcemaps in production

### TypeScript Settings
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- No emit (Vite handles compilation)

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Building
npm run build            # Type check + production build
npm run preview          # Preview production build

# Code Quality
npm run type-check       # Run TypeScript type checking
npm run lint             # Lint TypeScript files
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
```

## Browser Requirements

- Chrome/Edge 90+ (recommended for multiplayer)
- Firefox 88+
- Safari 14+ (limited WebRTC support)
- WebGL 2.0 required
- ES2022 support required
