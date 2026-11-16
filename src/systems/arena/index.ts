/**
 * Arena
 * Barrel export for combat stats and the deterministic battle simulation
 */

export {
  type ArenaPurse,
  type ArenaSnapshot,
  ArenaSystem,
  type FightOutcome,
  ladderTeam,
} from './ArenaSystem'
export {
  type BattleEvent,
  type BattleResult,
  type Fighter,
  type Side,
  simulateBattle,
  type TeamMember,
} from './battle'
export { ARCHETYPE_WHEEL, type CombatStats, deriveCombatStats, typeMultiplier } from './stats'
