# Shader Files Reorganization

## Changes Made

Moved shader filter files from `src/rendering/visual-effects` to `src/rendering/shaders`:

### Files Moved
- `ChromaticAberrationFilter.ts` → `src/rendering/shaders/ChromaticAberrationFilter.ts`
- `CRTFilter.ts` → `src/rendering/shaders/CRTFilter.ts`
- `FilmGrainFilter.ts` → `src/rendering/shaders/FilmGrainFilter.ts`

### Files Kept in visual-effects
- `LowResolutionRenderer.ts` - Actual rendering implementation, not a shader
- `BaseVisualEffect.ts` - Base class for effects
- `VisualEffectsManager.ts` - Manager for all effects
- `PerformanceMonitor.ts` - Performance tracking
- `PerformanceOptimizer.ts` - Performance optimization
- `ErrorHandler.ts` - Error handling

### Import Updates
- Updated `src/rendering/visual-effects/index.ts` to import filters from `../shaders/`
- Updated `src/rendering/visual-effects/VisualEffectsManager.ts` to import filters from `../shaders/`
- Updated `src/rendering/shaders/index.ts` to export the three filter classes

## Result

All shader-based filters are now in `src/rendering/shaders` with a single access point through the shaders index. The visual-effects directory now contains only performance management and rendering implementation files. No diagnostics errors detected.
