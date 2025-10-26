# Tech Stack

## **AI Snap** - Procedural Creature Photography Game

### **Core Technologies**

#### **Frontend Framework**
- **Vanilla TypeScript/JavaScript** - No framework overhead, pure ES2022+ with TypeScript
- **Custom Game Engine** - Built from scratch with modular architecture
- **WebGL-based 3D Graphics** - Real-time 3D rendering in the browser

#### **3D Graphics & Rendering**
- **Three.js** (v0.179.1) - 3D graphics library and WebGL abstraction
- **Custom Shader System** - GLSL vertex/fragment shaders for advanced visual effects
- **Post-Processing Pipeline** - Custom implementation using Three.js post-processing effects

#### **Development & Build Tools**
- **Vite** (v7.1.0) - Fast build tool and development server
- **TypeScript** (v5.8.3) - Type safety and modern JavaScript features
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **PostCSS** - CSS processing (via Vite)

### **Advanced Features**

#### **Visual Effects System**
- **CRT Filter** - Retro CRT monitor simulation with scanlines, curvature, phosphor glow
- **Film Grain Filter** - Realistic film grain with animation
- **Chromatic Aberration** - RGB channel offset effects (linear and radial)
- **Low Resolution Renderer** - Pixel art and retro aesthetic modes
- **Performance Monitor** - Real-time performance tracking and optimization
- **Error Handler** - Graceful fallbacks for WebGL failures

#### **Audio System**
- **Web Audio API** - Procedural audio generation
- **Custom Sound Effects** - Algorithmically generated creature sounds, UI feedback
- **Ambient Audio** - Forest sounds, wind, water, and creature vocalizations

#### **AI & Procedural Generation**
- **Seeded Random Generation** - Deterministic creature and world generation
- **Anatomy System** - Procedural creature body parts (heads, limbs, wings, tails, etc.)
- **Behavior AI** - Complex creature behaviors (wandering, territorial, curious, etc.)
- **Biome Generation** - Procedural terrain with multiple ecosystem types

### **Performance Optimizations**

#### **Memory Management**
- **Object Pooling** - Reuse of Three.js objects (Vector3, Color, etc.)
- **Efficient Disposal** - Proper cleanup of WebGL resources
- **Garbage Collection Optimization** - Reduced memory pressure

#### **Mathematical Optimizations**
- **Memoized Functions** - Cached trigonometric calculations
- **Fast Approximations** - Taylor series approximations for performance-critical code
- **TAU Constant** - 2π constant for cleaner mathematical expressions

#### **Bundle Optimizations**
- **Tree Shaking** - Dead code elimination
- **Code Splitting** - Separate chunks for Three.js and post-processing
- **Minification** - Terser compression with console removal
- **Source Maps** - Development debugging support

### **Project Structure**

```
src/
├── core/           # Game engine systems
│   ├── audio.ts           # Audio generation and management
│   ├── camera.ts          # Camera controls (ride + free roam)
│   ├── creatures.ts       # Creature generation and animation
│   ├── game.ts            # Main game loop and state
│   └── scene.ts           # 3D scene management
├── systems/        # Specialized game systems
│   ├── terrain-system.ts  # Procedural terrain generation
│   ├── park-structures.ts # Buildings and landmarks
│   ├── photo-system.ts    # Photography mechanics
│   └── ui.ts              # User interface and HUD
├── effects/        # Visual effects
│   ├── visual-effects/    # Post-processing filters
│   │   ├── CRTFilter.ts           # CRT monitor effects
│   │   ├── FilmGrainFilter.ts     # Film grain simulation
│   │   ├── ChromaticAberrationFilter.ts # RGB aberration
│   │   └── VisualEffectsManager.ts # Effect orchestration
│   └── shaders/           # GLSL shader programs
│       ├── InscryptionShader.ts   # Main visual effect shader
│       ├── ShaderManager.ts       # Shader compilation/loading
│       └── ShaderDebugUI.ts       # Real-time shader debugging
├── utils/          # Performance utilities
│   └── utils.ts           # Object pools, memoization, math helpers
└── types/          # TypeScript type definitions
```

### **Browser Compatibility**
- **Modern Browsers** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **WebGL 2.0** - Required for advanced shader features
- **ES2022** - Modern JavaScript features and modules
- **Web Audio API** - For procedural audio generation

### **Development Features**
- **Hot Module Replacement** - Fast development with Vite HMR
- **TypeScript Strict Mode** - Full type safety
- **ESLint + Prettier** - Code quality and formatting
- **Visual Debugging** - Real-time shader debugging interface
- **Performance Monitoring** - Built-in FPS and memory tracking

### **Game Features**
- **60+ Unique Creatures** - Procedurally generated with varied anatomies
- **Multiple Biomes** - Forest, meadow, rocky, wetland, crystal cave, floating islands
- **Advanced Visual Effects** - CRT simulation, film grain, chromatic aberration
- **Photography System** - Score-based creature photography
- **Video Recording** - Built-in screen recording capability
- **Settings System** - Customizable ride speed, creature info display

This tech stack provides a solid foundation for a high-performance 3D web game with advanced visual effects and procedural content generation, all running smoothly in modern web browsers.