/**
 * Maps
 * Barrel export for expedition map definitions, wild founders and the map manager
 */

export type { MapSnapshot, MapWallet, UnlockCheck, UnlockContext } from './MapManager'
export { MapManager } from './MapManager'
export {
  EXPEDITION_MAPS,
  generateWildForMap,
  generateWildPopulation,
  getMapDef,
  HUB_ID,
  type MapDef,
} from './maps'
