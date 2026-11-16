/**
 * Care System
 * Barrel export for feeding, hunger and mood of owned creatures
 */

export type {
  CareSnapshot,
  CycleSummary,
  FoodStock,
  HandFeedResult,
  MealResult,
  Reaction,
} from './CareSystem'
export { CareSystem, reactionFor } from './CareSystem'
export {
  BUY_CYCLES_AHEAD,
  type FoodBag,
  STOCK_MIN_EFFICIENCY,
  type StockResult,
  type StoreShelf,
  stockPen,
  wantedFoods,
} from './stocking'
