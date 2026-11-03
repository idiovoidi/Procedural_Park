/**
 * Breeding System
 * Barrel export for pairing rules, the offspring preview and the breeding den
 */

export type {
  BreedingJob,
  BreedingSnapshot,
  BreedingWallet,
  HatchEvent,
  StartResult,
} from './BreedingSystem'
export { BreedingSystem } from './BreedingSystem'
export type { PairingContext } from './pairing'
export { breedingCost, checkPairing, SIZE_ORDER } from './pairing'
export type { OffspringOdds, Outcome } from './preview'
export { describeOffspring, OPTIONAL_PARTS, sampleOffspring } from './preview'
