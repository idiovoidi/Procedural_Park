# Design Document

## Overview

The Inscryption visual effects system will be implemented as a collection of Pixi.js v8 filters that work together to create the complete retro aesthetic. The system includes low-resolution rendering with point filtering, chromatic aberration for lens distortion, animated film grain for texture, and optional vignette for atmospheric edge darkening.

The implementation will use custom Fragment shaders with proper TypeScript integration, following Pixi.js v8's new filter architecture. Each effect will be modular and configurable, allowing for fine-tuning and easy maintenance.

## Architecture

### Core Components

1. **LowResolutionRenderer**: Manages render-to-texture pipeline with point filtering
2. **ChromaticAberrationFilter**: Custom filter for RGB channel separation
3. **FilmGrainFilter**: Animated noise filter with time-based variation
4. **VignetteFilter**: Edge darkening filter with configurable falloff
5. **CRTFilter**: Comprehensive CRT monitor simulation with scanlines, curvature, and phosphor effects
6. **VisualEffectsManager**: Orchestrates all effects and manages filter pipeline
7. **EffectsConfiguration**: Centralized configuration management

### Rendering Pipeline

The effects will be applied in this specific order for optimal visual quality:
1. Game content rendered to low-resolution texture
2. Low-res texture upscaled with point filtering
3. Chromatic aberration applied
4. CRT effects applied (scanlines, curvature, phosphor glow)
5. Film grain added
6. Vignette applied (if enabled)

## Components and Interfaces

### LowResolutionRenderer

```typescript
interface LowResConfig {
  width: number;          // Low-res width (default: 480)
  height: number;         // Low-res height (default: 270)
  upscaleWidth: number;   // Target display width
  upscaleHeight: number;  // Target display height
}

class LowResolutionRenderer {
  private lowResTexture: RenderTexture;
  private displaySprite: Sprite;
  private gameContainer: Container;
  
  constructor(config: LowResConfig);
  render(app: Application): void;
  updateResolution(config: Partial<LowResConfig>): void;
  addToGameContainer(displayObject: DisplayObject): void;
}
```

### ChromaticAberrationFilter

```typescript
interface ChromaticAberrationConfig {
  offset: number;           // Aberration intensity (0.001 - 0.01)
  direction: [number, number]; // Direction vector [x, y]
  radial: boolean;         // Use radial aberration
}

class ChromaticAberrationFilter extends Filter {
  constructor(config: ChromaticAberrationConfig);
  
  get offset(): number;
  set offset(value: number);
  
  get direction(): [number, number];
  set direction(value: [number, number]);
  
  setRadialMode(enabled: boolean): void;
}
```

### FilmGrainFilter

```typescript
interface FilmGrainConfig {
  intensity: number;       // Grain strength (0.0 - 1.0)
  animated: boolean;       // Enable time-based animation
  speed: number;          // Animation speed multiplier
}

class FilmGrainFilter extends Filter {
  constructor(config: FilmGrainConfig);
  
  get intensity(): number;
  set intensity(value: number);
  
  updateTime(deltaTime: number): void;
  setAnimated(enabled: boolean): void;
}
```

### VignetteFilter

```typescript
interface VignetteConfig {
  intensity: number;       // Darkness intensity (0.0 - 1.0)
  outerRadius: number;     // Where vignette starts (0.0 - 1.0)
  falloff: number;        // Smoothness of transition (0.0 - 1.0)
}

class VignetteFilter extends Filter {
  constructor(config: VignetteConfig);
  
  get intensity(): number;
  set intensity(value: number);
  
  get outerRadius(): number;
  set outerRadius(value: number);
  
  get falloff(): number;
  set falloff(value: number);
}
```

### CRTFilter

```typescript
interface CRTConfig {
  scanlines: {
    enabled: boolean;      // Enable scanline effect
    intensity: number;     // Scanline darkness (0.0 - 1.0)
    spacing: number;       // Lines per pixel (1.0 - 4.0)
    thickness: number;     // Line thickness (0.1 - 1.0)
  };
  curvature: {
    enabled: boolean;      // Enable screen curvature
    amount: number;        // Curvature intensity (0.0 - 0.1)
    corners: number;       // Corner darkening (0.0 - 1.0)
  };
  phosphor: {
    enabled: boolean;      // Enable phosphor glow
    intensity: number;     // Glow strength (0.0 - 1.0)
    persistence: number;   // Glow decay time (0.1 - 2.0)
  };
  noise: {
    enabled: boolean;      // Enable CRT noise
    intensity: number;     // Static strength (0.0 - 0.1)
    speed: number;         // Noise animation speed (0.1 - 2.0)
  };
  flicker: {
    enabled: boolean;      // Enable brightness flicker
    intensity: number;     // Flicker amount (0.0 - 0.1)
    frequency: number;     // Flicker rate (0.1 - 5.0)
  };
}

class CRTFilter extends Filter {
  constructor(config: CRTConfig);
  
  get scanlines(): CRTConfig['scanlines'];
  set scanlines(value: Partial<CRTConfig['scanlines']>);
  
  get curvature(): CRTConfig['curvature'];
  set curvature(value: Partial<CRTConfig['curvature']>);
  
  get phosphor(): CRTConfig['phosphor'];
  set phosphor(value: Partial<CRTConfig['phosphor']>);
  
  get noise(): CRTConfig['noise'];
  set noise(value: Partial<CRTConfig['noise']>);
  
  get flicker(): CRTConfig['flicker'];
  set flicker(value: Partial<CRTConfig['flicker']>);
  
  updateTime(deltaTime: number): void;
  toggleComponent(component: keyof CRTConfig, enabled: boolean): void;
}
```

### VisualEffectsManager

```typescript
interface EffectsConfig {
  lowRes: LowResConfig;
  chromatic: ChromaticAberrationConfig & { enabled: boolean };
  crt: CRTConfig & { enabled: boolean };
  grain: FilmGrainConfig & { enabled: boolean };
  vignette: VignetteConfig & { enabled: boolean };
}

class VisualEffectsManager {
  private lowResRenderer: LowResolutionRenderer;
  private filters: Filter[];
  private config: EffectsConfig;
  
  constructor(app: Application, config: EffectsConfig);
  updateConfig(newConfig: Partial<EffectsConfig>): void;
  render(): void;
  toggleEffect(effectName: keyof EffectsConfig, enabled: boolean): void;
  addGameObject(displayObject: DisplayObject): void;
}
```

## Shader Implementation Details

### Chromatic Aberration Vertex Shader

```glsl
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition() {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord() {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main() {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
```

### Chromatic Aberration Fragment Shader (Linear)

```glsl
in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uOffset;
uniform vec2 uDirection;

void main() {
  vec2 offset = uDirection * uOffset;
  
  float r = texture(uTexture, vTextureCoord - offset).r;
  float g = texture(uTexture, vTextureCoord).g;
  float b = texture(uTexture, vTextureCoord + offset).b;
  float a = texture(uTexture, vTextureCoord).a;
  
  fragColor = vec4(r, g, b, a);
}
```

### Chromatic Aberration Fragment Shader (Radial)

```glsl
in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uOffset;

void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(vTextureCoord - center);
  
  vec2 direction = normalize(vTextureCoord - center);
  vec2 offset = direction * dist * uOffset;
  
  float r = texture(uTexture, vTextureCoord - offset).r;
  float g = texture(uTexture, vTextureCoord).g;
  float b = texture(uTexture, vTextureCoord + offset).b;
  float a = texture(uTexture, vTextureCoord).a;
  
  fragColor = vec4(r, g, b, a);
}
```

### Film Grain Fragment Shader

```glsl
in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uIntensity;
uniform float uTime;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture(uTexture, vTextureCoord);
  
  float noise = rand(vTextureCoord + uTime) - 0.5;
  float grain = noise * uIntensity;
  
  color.rgb += vec3(grain);
  
  fragColor = color;
}
```

### Vignette Fragment Shader

```glsl
in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uIntensity;
uniform float uOuterRadius;
uniform float uFalloff;

void main() {
  vec4 color = texture(uTexture, vTextureCoord);
  
  vec2 center = vec2(0.5, 0.5);
  float dist = length(vTextureCoord - center);
  
  float vignette = smoothstep(uOuterRadius, uOuterRadius - uFalloff, dist);
  
  color.rgb = mix(color.rgb * (1.0 - uIntensity), color.rgb, vignette);
  
  fragColor = color;
}
```

### CRT Fragment Shader

```glsl
in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

// Scanline uniforms
uniform bool uScanlinesEnabled;
uniform float uScanlineIntensity;
uniform float uScanlineSpacing;
uniform float uScanlineThickness;

// Curvature uniforms
uniform bool uCurvatureEnabled;
uniform float uCurvatureAmount;
uniform float uCornerDarkening;

// Phosphor uniforms
uniform bool uPhosphorEnabled;
uniform float uPhosphorIntensity;
uniform float uPhosphorPersistence;

// Noise uniforms
uniform bool uNoiseEnabled;
uniform float uNoiseIntensity;
uniform float uNoiseSpeed;

// Flicker uniforms
uniform bool uFlickerEnabled;
uniform float uFlickerIntensity;
uniform float uFlickerFrequency;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 applyCurvature(vec2 uv) {
  if (!uCurvatureEnabled) return uv;
  
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(6.0, 4.0);
  uv = uv + uv * offset * offset * uCurvatureAmount;
  uv = uv * 0.5 + 0.5;
  
  return uv;
}

float getCornerMask(vec2 uv) {
  if (!uCurvatureEnabled) return 1.0;
  
  vec2 crt = max(vec2(0.0), abs(uv * 2.0 - 1.0) - vec2(1.0));
  float corner = length(crt);
  return smoothstep(0.0, uCornerDarkening, 1.0 - corner);
}

float getScanlines(vec2 uv) {
  if (!uScanlinesEnabled) return 1.0;
  
  float scanline = sin(uv.y * uResolution.y * uScanlineSpacing) * 0.5 + 0.5;
  scanline = smoothstep(1.0 - uScanlineThickness, 1.0, scanline);
  return mix(1.0 - uScanlineIntensity, 1.0, scanline);
}

vec3 getPhosphorGlow(vec4 color, vec2 uv) {
  if (!uPhosphorEnabled) return color.rgb;
  
  float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float glow = pow(brightness, uPhosphorPersistence) * uPhosphorIntensity;
  
  return color.rgb + vec3(glow * 0.1, glow * 0.3, glow * 0.1);
}

float getNoise(vec2 uv) {
  if (!uNoiseEnabled) return 0.0;
  
  float noise = rand(uv + uTime * uNoiseSpeed) - 0.5;
  return noise * uNoiseIntensity;
}

float getFlicker() {
  if (!uFlickerEnabled) return 1.0;
  
  float flicker = sin(uTime * uFlickerFrequency * 6.28318) * 0.5 + 0.5;
  return 1.0 - (flicker * uFlickerIntensity);
}

void main() {
  vec2 uv = applyCurvature(vTextureCoord);
  
  // Sample texture with bounds checking
  vec4 color = vec4(0.0);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    color = texture(uTexture, uv);
  }
  
  // Apply CRT effects
  float cornerMask = getCornerMask(uv);
  float scanlines = getScanlines(uv);
  vec3 phosphor = getPhosphorGlow(color, uv);
  float noise = getNoise(uv);
  float flicker = getFlicker();
  
  // Combine all effects
  vec3 finalColor = phosphor;
  finalColor *= scanlines;
  finalColor *= cornerMask;
  finalColor += vec3(noise);
  finalColor *= flicker;
  
  fragColor = vec4(finalColor, color.a);
}
```

## Data Models

### Configuration Schema

```typescript
interface InscryptionVisualEffectsConfig {
  // Low-resolution rendering
  lowRes: {
    enabled: boolean;
    width: number;          // 480 (default)
    height: number;         // 270 (default)
    upscaleWidth: number;   // 1920 (default)
    upscaleHeight: number;  // 1080 (default)
  };
  
  // Chromatic aberration
  chromatic: {
    enabled: boolean;       // false (default)
    offset: number;         // 0.002 (default)
    direction: [number, number]; // [1.0, 0.0] (default)
    radial: boolean;        // false (default)
  };
  
  // Film grain
  grain: {
    enabled: boolean;       // true (default)
    intensity: number;      // 0.05 (default)
    animated: boolean;      // true (default)
    speed: number;          // 1.0 (default)
  };
  
  // CRT effects
  crt: {
    enabled: boolean;       // false (default)
    scanlines: {
      enabled: boolean;     // true (default when CRT enabled)
      intensity: number;    // 0.3 (default)
      spacing: number;      // 2.0 (default)
      thickness: number;    // 0.5 (default)
    };
    curvature: {
      enabled: boolean;     // true (default when CRT enabled)
      amount: number;       // 0.02 (default)
      corners: number;      // 0.3 (default)
    };
    phosphor: {
      enabled: boolean;     // true (default when CRT enabled)
      intensity: number;    // 0.2 (default)
      persistence: number;  // 1.5 (default)
    };
    noise: {
      enabled: boolean;     // false (default)
      intensity: number;    // 0.02 (default)
      speed: number;        // 1.0 (default)
    };
    flicker: {
      enabled: boolean;     // false (default)
      intensity: number;    // 0.05 (default)
      frequency: number;    // 2.0 (default)
    };
  };
  
  // Vignette
  vignette: {
    enabled: boolean;       // false (default)
    intensity: number;      // 0.4 (default)
    outerRadius: number;    // 0.7 (default)
    falloff: number;        // 0.5 (default)
  };
}
```

## Error Handling

### Filter Compilation Errors
- Graceful fallback to standard rendering if shader compilation fails
- Detailed error logging with shader source code context
- Automatic retry mechanism for transient WebGL issues

### Performance Degradation
- FPS monitoring to detect performance impact
- Automatic quality reduction if frame rate drops
- Option to disable expensive effects dynamically

### WebGL Context Management
- Proper resource cleanup on context loss
- Automatic filter recreation on context restore
- Memory management for render textures

## Testing Strategy

### Unit Tests
- Filter parameter validation and clamping
- Shader uniform updates
- Configuration management
- Error handling scenarios

### Integration Tests
- Multi-filter pipeline functionality
- Performance impact measurement
- WebGL compatibility testing
- Memory leak detection

### Visual Tests
- Screenshot comparison for effect accuracy
- Cross-browser rendering consistency
- Mobile device compatibility
- Effect combination validation

## Performance Considerations

### Optimization Strategies
- Filter order optimization (expensive effects first)
- Shader instruction minimization
- Texture memory management
- Conditional effect application based on performance

### Mobile Compatibility
- Reduced precision for mobile GPUs
- Simplified shader variants for older devices
- Automatic quality scaling based on device capabilities

### Memory Management
- Proper disposal of render textures
- Filter resource cleanup
- Garbage collection optimization

## Browser Compatibility

### WebGL Support
- WebGL 1.0 and 2.0 compatibility
- Fallback strategies for unsupported features
- Vendor-specific extension handling

### Performance Profiling
- Frame time monitoring
- GPU utilization tracking
- Memory usage analysis
- Automatic performance adjustments