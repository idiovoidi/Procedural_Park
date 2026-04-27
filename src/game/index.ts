// Barrel export for game module

export type { GameEvents } from './EventBus'
// Game utilities
export { EventBus, EventBusClass } from './EventBus'
// Core game classes
export { Game } from './Game'
export { GameLoop } from './GameLoop'
export type { GameStateConfig } from './GameStateManager'
export { GameStateManager } from './GameStateManager'
export { InputHandler } from './InputHandler'
// Managers
export { CreatureManager, MultiplayerManager, ShaderService } from './managers'
export type { ParticleConfig, ParticleType } from './ParticleSystem'
export { Particle, ParticleSystem } from './ParticleSystem'
export { SystemsCoordinator } from './SystemsCoordinator'
export { VideoRecorder } from './VideoRecorder'
