# Implementation Plan

- [x] 1. Set up new directory structure and configuration
  - Create all module directories (`core/`, `systems/`, `rendering/`, `ui/`, `multiplayer/`)
  - Create subdirectories for each module
  - Configure TypeScript path aliases in `tsconfig.json`
  - Configure Vite path aliases in `vite.config.ts`
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 2. Create barrel export files
  - Create `index.ts` files for all modules and submodules
  - Set up initial empty exports (will be populated as files are moved)

  - _Requirements: 2.1, 2.2_

- [x] 3. Move and refactor core utilities

- [x] 3.1 Move constants to `core/constants/`
  - Split `constants.ts` into logical files (`game-config.ts`, `biome-config.ts`, `physics.ts`)
  - Create barrel export in `core/constants/index.ts`
  - Update all imports to use `@core/constants`
  - _Requirements: 1.1, 1.3, 4.1, 5.3_

- [x] 3.2 Move utilities to `core/utils/`
  - Split `utils.ts` into logical files (`math.ts`, `pooling.ts`, `random.ts`)
  - Create barrel export in `core/utils/index.ts`
  - Update all imports to use `@core/utils`
  - _Requirements: 1.1, 1.3, 4.1, 5.3_

- [x] 3.3 Move type definitions to `core/types/`
  - Extract shared types from various files
  - Create `common.ts` and `geometry.ts` in `core/types/`

  - Create barrel export in `core/types/index.ts`

  - Update all imports to use `@core/types`
  - _Requirements: 1.1, 1.3, 4.1, 5.3_

- [x] 4. Move creature system to `systems/creatures/`

- [x] 4.1 Refactor creatures.ts into multiple files
  - Create `creature-generator.ts` for anatomy generation
  - Create `creature-builder.ts` for mesh building
  - Create `creature-behavior.ts` for behavior logic (move from `creature_behaviour.ts`)
  - Create `creature-pool.ts` for pooling
  - Create `types.ts` for creature types
  - Keep `CreatureManager.ts` in `game/` (orchestration layer)
  - _Requirements: 1.1, 1.3, 1.5, 4.1_

- [x] 4.2 Create barrel export and update imports
  - Create `systems/creatures/index.ts` with public API
  - Update all imports to use `@systems/creatures`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 5. Move terrain system to `systems/terrain/`

- [x] 5.1 Refactor terrain-system.ts
  - Move `TerrainSystem` class to `systems/terrain/TerrainSystem.ts`
  - Extract biome generation logic to `biome-generator.ts`
  - Create `types.ts` for terrain types
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 5.2 Create barrel export and update imports
  - Create `systems/terrain/index.ts` with public API
  - Update all imports to use `@systems/terrain`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 6. Move audio system to `systems/audio/`

- [x] 6.1 Refactor audio.ts
  - Move `AudioManager` class to `systems/audio/AudioManager.ts`
  - Extract sound generation to `sound-generator.ts`
  - Create `types.ts` for audio types
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 6.2 Create barrel export and update imports
  - Create `systems/audio/index.ts` with public API
  - Update all imports to use `@systems/audio`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 7. Move camera system to `systems/camera/`

- [x] 7.1 Move camera.ts
  - Move `CameraController` class to `systems/camera/CameraController.ts`
  - Create `types.ts` for camera types
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 7.2 Create barrel export and update imports
  - Create `systems/camera/index.ts` with public API

  - Update all imports to use `@systems/camera`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 8. Move photo system to `systems/photo/`

- [x] 8.1 Refactor photo-system.ts
  - Move `PhotoSystem` class to `systems/photo/PhotoSystem.ts`
  - Extract scoring logic to `scoring.ts`
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 8.2 Create barrel export and update imports
  - Create `systems/photo/index.ts` with public API
  - Update all imports to use `@systems/photo`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 9. Move input system to `systems/input/`

- [x] 9.1 Move input-manager.ts
  - Move `InputManager` class to `systems/input/InputManager.ts`
  - Create `types.ts` for input types
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 9.2 Create barrel export and update imports
  - Create `systems/input/index.ts` with public API
  - Update all imports to use `@systems/input`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 10. Move state management to `systems/state/`

- [x] 10.1 Move state files
  - Move `state-machine.ts` to `systems/state/state-machine.ts`
  - Move `state-integration.ts` to `systems/state/state-integration.ts`
  - Move `subsystem-state-manager.ts` to `systems/state/subsystem-state-manager.ts`
  - Move `subsystem-states.ts` to `systems/state/subsystem-states.ts`
  - Move `state-sync-helpers.ts` to `systems/state/state-sync-helpers.ts`

  - _Requirements: 1.1, 1.3, 4.1_

- [x] 10.2 Create barrel export and update imports
  - Create `systems/state/index.ts` with public API
  - Update all imports to use `@systems/state`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 11. Move scene management to `rendering/scene/`

- [x] 11.1 Refactor scene.ts
  - Move `SceneManager` class to `rendering/scene/SceneManager.ts`
  - Move `environment-interactions.ts` to `rendering/scene/environment-interactions.ts`
  - Move `park-structures.ts` to `rendering/scene/park-structures.ts`
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 11.2 Create barrel export and update imports
  - Create `rendering/scene/index.ts` with public API
  - Update all imports to use `@rendering/scene`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 12. Move shader system to `rendering/shaders/`

- [x] 12.1 Move shader files
  - Move `shaders/ShaderManager.ts` to `rendering/shaders/ShaderManager.ts`
  - Move `shaders/InscryptionShader.ts` to `rendering/shaders/InscryptionShader.ts`
  - Move other shader files to `rendering/shaders/`
  - Create `types.ts` for shader types
  - _Requirements: 1.1, 1.3, 4.1_

- [ ] 12.2 Create barrel export and update imports
  - Create `rendering/shaders/index.ts` with public API
  - Update all imports to use `@rendering/shaders`
  - _Requirements: 2.1, 2.2, 5.3_

- [-] 13. Move visual effects to `rendering/visual-effects/`

- [ ] 13.1 Move visual effects files
  - Move `visual-effects/` directory to `rendering/visual-effects/`

  - Ensure all files are properly organized

  - _Requirements: 1.1, 1.3, 4.1_

- [x] 13.2 Create barrel export and update imports
  - Create `rendering/visual-effects/index.ts` with public API
  - Update all imports to use `@rendering/visual-effects`

  - _Requirements: 2.1, 2.2, 5.3_

- [ ] 14. Move textures to `rendering/textures/`

- [ ] 14.1 Move textures.ts
  - Move `textures.ts` to `rendering/textures/texture-generator.ts`
  - _Requirements: 1.1, 1.3, 4.1_

- [ ] 14.2 Create barrel export and update imports
  - Create `rendering/textures/index.ts` with public API
  - Update all imports to use `@rendering/textures`

  - _Requirements: 2.1, 2.2, 5.3_

- [ ] 15. Move UI system to `ui/`

- [ ] 15.1 Refactor ui.ts into components
  - Create `ui/managers/UIManager.ts` for main UI manager
  - Extract gallery logic to `ui/components/gallery.ts`
  - Extract settings logic to `ui/components/settings.ts`
  - Extract shortcuts logic to `ui/components/shortcuts.ts`
  - Extract mini-map logic to `ui/components/mini-map.ts`
  - Extract toast logic to `ui/components/toast.ts`
  - _Requirements: 1.1, 1.3, 1.5, 4.1_

- [ ] 15.2 Move debug UI
  - Move `debug.ts` to `ui/debug/DebugPanel.ts`
  - Move `shaders/ShaderDebugUI.ts` to `ui/debug/ShaderDebugUI.ts`
  - _Requirements: 1.1, 1.3, 4.1_

- [ ] 15.3 Create barrel exports and update imports
  - Create `ui/components/index.ts` with public API
  - Create `ui/managers/index.ts` with public API
  - Create `ui/debug/index.ts` with public API
  - Update all imports to use `@ui/*`
  - _Requirements: 2.1, 2.2, 5.3_

- [x] 16. Move multiplayer system to `multiplayer/`

- [x] 16.1 Reorganize multiplayer directory
  - Move `multiplayer/WebRTCPeer.ts` to `multiplayer/webrtc/WebRTCPeer.ts`
  - Move `multiplayer/ConnectionUI.ts` to `multiplayer/webrtc/ConnectionUI.ts`
  - Move `multiplayer/StateSync.ts` to `multiplayer/state-sync/StateSync.ts`
  - Move `multiplayer/PeerAvatar.ts` to `multiplayer/peer-avatar/PeerAvatar.ts`
  - Keep `MultiplayerManager.ts` in `game/managers/` (orchestration layer)
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 16.2 Create barrel exports and update imports
  - Create `multiplayer/webrtc/index.ts` with public API
  - Create `multiplayer/state-sync/index.ts` with public API
  - Create `multiplayer/peer-avatar/index.ts` with public API
  - Update all imports to use `@multiplayer/*`
  - _Requirements: 2.1, 2.2, 5.3_

- [ ] 17. Organize game orchestration layer

- [x] 17.1 Keep game directory organized
  - Ensure `Game.ts`, `GameLoop.ts`, `SystemsCoordinator.ts`, `InputHandler.ts` remain in `game/`
  - Move `CreatureManager.ts`, `MultiplayerManager.ts`, `ShaderService.ts` to `game/managers/`
  - _Requirements: 1.1, 1.4, 4.1_

- [ ] 17.2 Update game imports
  - Update all imports in game files to use new path aliases
  - _Requirements: 5.3_

- [x] 18. Update documentation

- [x] 18.1 Update structure documentation
  - Rewrite `docs/structure.md` with new module structure

  - Add module dependency diagram
  - Document each module's purpose and responsibilities
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 18.2 Create migration guide
  - Create `docs/migration-guide.md` explaining the changes
  - Document old vs new import paths
  - Provide examples of how to find files in new structure
  - _Requirements: 7.5_

- [x] 18.3 Update README
  - Update import examples in README.md
  - Add section about module structure
  - _Requirements: 7.1, 7.4_

- [x] 18.4 Create module documentation
  - Create `docs/modules/` directory
  - Add documentation for each major module
  - _Requirements: 7.2, 7.3_

- [x] 19. Verify and test

- [x] 19.1 Build verification
  - Run `npm run build` to ensure no build errors
  - Verify bundle size is reasonable
  - Check for any circular dependency warnings
  - _Requirements: 3.1, 3.4, 6.2_

- [ ] 19.2 Type checking
  - Run `npm run type-check` to ensure no type errors
  - Fix any type issues that arise from restructuring

  - _Requirements: 6.2_

- [ ] 19.3 Manual feature testing
  - Test all camera modes (ride and free roam)
  - Test photo capture and gallery
  - Test creature spawning and behavior
  - Test multiplayer connection

  - Test shader effects
  - Test all UI panels and controls

  - _Requirements: 6.1, 6.4_

- [ ] 19.4 Performance verification
  - Verify application loads and runs smoothly
  - Check for any performance regressions
  - Verify bundle size hasn't increased significantly
  - _Requirements: 6.1, 6.4_

- [x] 20. Final cleanup

  - Remove any old unused files
  - Ensure all imports use path aliases (no relative imports to other modules)
  - Verify all barrel exports are complete
  - Run linter and fix any issues
  - _Requirements: 2.5, 5.3, 6.2_
