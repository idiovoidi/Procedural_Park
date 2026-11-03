/**
 * Contracts
 * Barrel export for the Contract Board
 */

export type {
  CoinPurse,
  Contract,
  ContractSnapshot,
  FulfilResult,
  Requirement,
} from './ContractBoard'
export {
  ContractBoard,
  describeContract,
  describeRequirement,
  generateContract,
  matchesContract,
  meetsRequirement,
} from './ContractBoard'
