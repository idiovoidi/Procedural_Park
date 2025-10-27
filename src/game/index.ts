// Barrel export for game module

// Core game classes
export { Game } from './Game'
export { GameLoop } from './GameLoop'
export { SystemsCoordinator } from './SystemsCoordinator'
export { InputHandler } from './InputHandler'

// Game utilities
export { EventBus, EventBusClass } from './EventBus'
export type { GameEvents } from './EventBus'
export { GameStateManager } from './GameStateManager'
export type { GameStateConfig } from './GameStateManager'
export { ParticleSystem, Particle } from './ParticleSystem'
export type { ParticleType, ParticleConfig } from './ParticleSystem'
export { VideoRecorder } from './VideoRecorder'

// Managers
export { CreatureManager, MultiplayerManager, ShaderService } from './managers'
