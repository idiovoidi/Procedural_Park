# Rendering Module

## Overview

The `rendering` module handles all rendering-related functionality including scene management, shaders, and texture generation. It depends on both `core` and `systems` modules.

**Import Path**: `@rendering/*`

**Dependencies**: `@core/*`, `@systems/*`

## Structure

```
rendering/
├── scene/           # Scene management
├── shaders/         # Shader programs
└── textures/        # Texture generation
```

## Scene System (`@rendering/scene`)

Manages the Three.js scene, environment interactions, and park structures.

### Key Components

- **SceneManager.ts**: Main scene management class
- **environment-interactions.ts**: Creature-environment interactions
- **park-structures.ts**: Buildings, landmarks, and structures

### Usage

```typescript
import { SceneManager } from '@rendering/scene'

const sceneManager = new SceneManager()
const scene = sceneManager.getScene()

// Add objects to scene
sceneManager.addCreature(creature)
sceneManager.addStructure(building)

// Update interactions
sceneManager.updateInteractions(deltaTime)
```

### Scene Management

The SceneManager handles:
- Scene initialization and setup
- Lighting configuration
- Object addition/removal
- Environment interactions
- Park structure placement

## Shader System (`@rendering/shaders`)

Manages custom GLSL shaders and shader effects.

### Key Components

- **ShaderManager.ts**: Shader management and application
- **InscryptionShader.ts**: Inscryption-style retro shader
- **types.ts**: Shader-related type definitions

### Usage

```typescript
import { ShaderManager } from '@rendering/shaders'

const shaderManager = new ShaderManager(renderer, scene, camera)

// Apply shader
shaderManager.applyShader('inscryption', {
  pixelSize: 4,
  colorDepth: 16
})

// Update shader uniforms
shaderManager.updateUniforms('inscryption', {
  time: performance.now()
})
```

### Available Shaders

- **Inscryption Shader**: Retro pixel-art style with color reduction
- **Custom Shaders**: Add your own GLSL shaders

### Creating Custom Shaders

```typescript
// shaders/MyCustomShader.ts
export class MyCustomShader {
  vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  fragmentShader = `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Apply custom effect
      gl_FragColor = color;
    }
  `
}
```

## Texture System (`@rendering/textures`)

Procedural texture generation for creatures and environment.

### Key Components

- **texture-generator.ts**: Procedural texture generation

### Usage

```typescript
import { generateCreatureTexture, generateTerrainTexture } from '@rendering/textures'

// Generate creature texture
const texture = generateCreatureTexture(anatomy, seed)

// Generate terrain texture
const terrainTexture = generateTerrainTexture(biomeType, seed)
```

### Texture Generation

The texture system generates:
- Creature skin textures with patterns
- Terrain textures based on biome
- Procedural patterns and noise

## Best Practices

### Rendering Pipeline

Set up the rendering pipeline in the correct order:

```typescript
// 1. Create scene
const sceneManager = new SceneManager()

// 2. Set up shaders
const shaderManager = new ShaderManager(renderer, scene, camera)

// 3. Render loop
function render() {
  sceneManager.update(deltaTime)
  shaderManager.update(deltaTime)
}
```

### Performance Optimization

- **Use object pooling**: Pool frequently created objects
- **Batch rendering**: Group similar objects
- **LOD (Level of Detail)**: Use lower detail for distant objects
- **Frustum culling**: Only render visible objects
- **Texture atlases**: Combine textures to reduce draw calls

```typescript
// ✅ Good: Batch similar objects
const instancedMesh = new InstancedMesh(geometry, material, count)

// ❌ Bad: Individual meshes
for (let i = 0; i < count; i++) {
  scene.add(new Mesh(geometry, material))
}
```

### Shader Uniforms

Update shader uniforms efficiently:

```typescript
// ✅ Good: Update only when needed
if (timeChanged) {
  shaderManager.updateUniforms('myShader', { time })
}

// ❌ Bad: Update every frame unnecessarily
shaderManager.updateUniforms('myShader', { staticValue })
```

## Adding New Rendering Features

### Adding a New Shader

1. Create shader file: `rendering/shaders/MyShader.ts`
2. Implement vertex and fragment shaders
3. Add to ShaderManager
4. Export from `rendering/shaders/index.ts`

### Adding Texture Generation

1. Add function to `rendering/textures/texture-generator.ts`
2. Use procedural generation techniques
3. Export from `rendering/textures/index.ts`

## Common Issues

### Shader Compilation Errors

Check shader syntax and uniforms:
```typescript
// Enable shader debugging
shaderManager.enableDebug()
```

### Performance Issues

Profile rendering performance:
```typescript
// Use Three.js stats
import Stats from 'three/examples/jsm/libs/stats.module'
const stats = new Stats()
document.body.appendChild(stats.dom)
```
