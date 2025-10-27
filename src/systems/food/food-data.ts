/**
 * Food Data
 * Defines all available food items
 */

import type { FoodItem } from './types'

export const FOOD_ITEMS: Record<string, Omit<FoodItem, 'quantity'>> = {
  berry: {
    id: 'berry',
    name: 'Wild Berry',
    type: 'berry',
    icon: '🫐',
    description: 'Sweet berries loved by terrestrial creatures',
    rarity: 'common',
    effectiveness: {
      terrestrial: 1.0,
      aerial: 0.7,
      aquatic: 0.3,
      ethereal: 0.5,
      crystalline: 0.2,
    },
    effects: {
      happiness: 10,
      trustBonus: 5,
      poseChance: 0.3,
    },
  },
  meat: {
    id: 'meat',
    name: 'Fresh Meat',
    type: 'meat',
    icon: '🥩',
    description: 'Protein-rich food for carnivorous creatures',
    rarity: 'uncommon',
    effectiveness: {
      terrestrial: 0.9,
      aerial: 0.8,
      aquatic: 0.6,
      ethereal: 0.2,
      crystalline: 0.1,
    },
    effects: {
      happiness: 15,
      trustBonus: 10,
      poseChance: 0.4,
    },
  },
  fish: {
    id: 'fish',
    name: 'Fresh Fish',
    type: 'fish',
    icon: '🐟',
    description: 'Aquatic delicacy preferred by water creatures',
    rarity: 'uncommon',
    effectiveness: {
      terrestrial: 0.4,
      aerial: 0.6,
      aquatic: 1.0,
      ethereal: 0.3,
      crystalline: 0.2,
    },
    effects: {
      happiness: 15,
      trustBonus: 10,
      poseChance: 0.4,
    },
  },
  crystal: {
    id: 'crystal',
    name: 'Energy Crystal',
    type: 'crystal',
    icon: '💎',
    description: 'Crystallized energy for crystalline beings',
    rarity: 'rare',
    effectiveness: {
      terrestrial: 0.3,
      aerial: 0.5,
      aquatic: 0.4,
      ethereal: 0.8,
      crystalline: 1.0,
    },
    effects: {
      happiness: 20,
      trustBonus: 15,
      poseChance: 0.5,
    },
  },
  energy: {
    id: 'energy',
    name: 'Pure Energy',
    type: 'energy',
    icon: '✨',
    description: 'Condensed energy loved by ethereal creatures',
    rarity: 'epic',
    effectiveness: {
      terrestrial: 0.2,
      aerial: 0.7,
      aquatic: 0.3,
      ethereal: 1.0,
      crystalline: 0.8,
    },
    effects: {
      happiness: 25,
      trustBonus: 20,
      poseChance: 0.6,
    },
  },
}

// Default starting inventory for testing
export const DEFAULT_FOOD_INVENTORY: FoodItem[] = [
  { ...FOOD_ITEMS.berry, quantity: 10 },
  { ...FOOD_ITEMS.meat, quantity: 5 },
  { ...FOOD_ITEMS.fish, quantity: 5 },
  { ...FOOD_ITEMS.crystal, quantity: 3 },
  { ...FOOD_ITEMS.energy, quantity: 2 },
]
