# Design Document

## Overview

The structure assets system will enhance the existing park infrastructure by creating a dedicated asset organization system and expanding the lamp model functionality. The design builds upon the existing `ParkStructures` class while introducing a modular approach for managing different types of park structures.

## Architecture

### Current System Analysis

The existing `ParkStructures` class already includes basic lamp functionality through the `createLampPost()` method. However, the current implementation:
- Has lamp posts hardcoded in specific locations (plaza area)
- Lacks a flexible asset organization system
- Doesn't support easy addition of new structure types
- Has limited lamp customization options

### Proposed Architecture

```
src/
├── structures/                    # New dedicated structures folder
│   ├── base/                     # Base classes and interfaces
│   │   ├── BaseStructure.ts      # Abstract base class
│   │   └── StructureManager.ts   # Manager for all structures
│   ├── lighting/                 # Lighting structures
│   │   ├── LampPost.ts          # Enhanced lamp post implementation
│   │   ├── LanternPost.ts       # Decorative lanterns
│   │   └── index.ts             # Lighting exports
│   ├── seating/                  # Future: benches, picnic tables
│   ├── signage/                  # Future: signs, information boards
│   └── index.ts                  # Main structures export
```

## Components and Interfaces

### BaseStructure Interface

```typescript
interface IStructure {
  id: string
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  group: THREE.Group
  
  create(): void
  update(deltaTime: number): void
  dispose(): void
  setPosition(position: THREE.Vector3): void
  setRotation(rotation: THREE.Euler): void
  setScale(scale: THREE.Vector3): void
}
```

### StructureManager Class

The `StructureManager` will handle:
- Registration and management of all structure instances
- Batch operations (update, dispose)
- Spatial organization and optimization
- Integration with existing scene management

### Enhanced LampPost Class

Building on the existing lamp implementation with:
- Configurable lamp styles (modern, vintage, decorative)
- Dynamic lighting properties (color, intensity, range)
- Time-based activation (day/night cycles)
- Multiple lamp head configurations
- Material variations (metal, wood, stone)

## Data Models

### LampConfiguration

```typescript
interface LampConfiguration {
  style: 'modern' | 'vintage' | 'decorative' | 'industrial'
  height: number
  postMaterial: 'metal' | 'wood' | 'stone'
  lightColor: THREE.Color
  lightIntensity: number
  lightRange: number
  castShadows: boolean
  emissiveIntensity: number
  autoActivation: boolean
}
```

### StructureAssetDefinition

```typescript
interface StructureAssetDefinition {
  type: string
  category: 'lighting' | 'seating' | 'signage' | 'decorative'
  defaultConfig: Record<string, any>
  geometryFactory: () => THREE.BufferGeometry
  materialFactory: (config: any) => THREE.Material
}
```

## Integration with Existing Systems

### Scene Management Integration

- Extend existing `ParkStructures` class to use new `StructureManager`
- Maintain backward compatibility with current structure placement
- Integrate with existing lighting system and shadow mapping

### Performance Considerations

- Use instanced rendering for repeated lamp models
- Implement LOD (Level of Detail) for distant structures
- Batch similar structures for efficient rendering
- Optimize shadow casting based on distance and importance

## Error Handling

### Asset Loading Errors

- Graceful fallback to basic geometric shapes if complex models fail
- Error logging for debugging asset issues
- Default configurations for missing or invalid parameters

### Runtime Errors

- Safe disposal of Three.js resources
- Error boundaries for structure updates
- Validation of position and configuration parameters

## Testing Strategy

### Unit Testing

- Test structure creation and configuration
- Validate geometric calculations and positioning
- Test material and lighting property application

### Integration Testing

- Test integration with existing `ParkStructures` system
- Verify scene management and rendering pipeline
- Test performance with multiple structure instances

### Visual Testing

- Verify lamp lighting effects and shadows
- Test different lamp configurations and styles
- Validate day/night cycle integration

## Implementation Phases

### Phase 1: Foundation
- Create base structure interfaces and classes
- Set up folder organization
- Implement basic `StructureManager`

### Phase 2: Enhanced Lamp System
- Refactor existing lamp functionality
- Implement configurable lamp styles
- Add dynamic lighting features

### Phase 3: Asset Organization
- Create category-based folder structure
- Implement asset registration system
- Add support for custom configurations

### Phase 4: Integration & Optimization
- Integrate with existing park structures
- Implement performance optimizations
- Add batch operations and management features

## Future Extensibility

The modular design allows for easy addition of:
- New structure categories (playground equipment, water features)
- Custom structure types with unique behaviors
- Asset loading from external files (GLTF, OBJ)
- Procedural structure generation
- Interactive structures with user controls