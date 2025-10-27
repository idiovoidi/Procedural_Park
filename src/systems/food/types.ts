/**
 * Food System Types
 */

export type FoodType = 'berry' | 'meat' | 'fish' | 'crystal' | 'energy'

export type FoodRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface FoodItem {
  id: string
  name: string
  type: FoodType
  icon: string
  description: string
  rarity: FoodRarity
  quantity: number
  effectiveness: {
    terrestrial: number
    aerial: number
    aquatic: number
    ethereal: number
    crystalline: number
  }
  effects: {
    happiness: number
    trustBonus: number
    poseChance: number
  }
}

export interface FeedingResult {
  success: boolean
  creatureName: string
  foodUsed: FoodItem
  effectivenessScore: number
  creatureReaction: 'loved' | 'liked' | 'neutral' | 'disliked'
  bonusApplied: boolean
}
