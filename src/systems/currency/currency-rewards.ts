/**
 * Currency Rewards
 * Defines how players earn money
 */

export const CURRENCY_REWARDS = {
  // Photo rewards based on score
  PHOTO_EXCELLENT: 50, // 80+ score
  PHOTO_GREAT: 30, // 60-79 score
  PHOTO_GOOD: 15, // 40-59 score
  PHOTO_BASIC: 5, // < 40 score

  // Creature discovery bonuses
  DISCOVER_COMMON: 10,
  DISCOVER_UNCOMMON: 25,
  DISCOVER_RARE: 50,
  DISCOVER_EPIC: 100,
  DISCOVER_LEGENDARY: 200,

  // Activity rewards
  FEED_CREATURE: 5,
  CREATURE_LOVED_FOOD: 10, // Bonus when creature loves the food
  COMPLETE_RIDE: 20,
  DAILY_LOGIN: 50,
} as const

/**
 * Calculate photo reward based on score
 */
export function calculatePhotoReward(score: number): number {
  if (score >= 80) return CURRENCY_REWARDS.PHOTO_EXCELLENT
  if (score >= 60) return CURRENCY_REWARDS.PHOTO_GREAT
  if (score >= 40) return CURRENCY_REWARDS.PHOTO_GOOD
  return CURRENCY_REWARDS.PHOTO_BASIC
}

/**
 * Calculate discovery reward based on rarity
 */
export function calculateDiscoveryReward(rarity: string): number {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return CURRENCY_REWARDS.DISCOVER_LEGENDARY
    case 'epic':
      return CURRENCY_REWARDS.DISCOVER_EPIC
    case 'rare':
      return CURRENCY_REWARDS.DISCOVER_RARE
    case 'uncommon':
      return CURRENCY_REWARDS.DISCOVER_UNCOMMON
    case 'common':
    default:
      return CURRENCY_REWARDS.DISCOVER_COMMON
  }
}
