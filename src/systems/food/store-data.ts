/**
 * Store Data
 * Defines items available for purchase in the food store
 */

import type { StoreItem } from '@ui/components/food-store'

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'berry',
    name: 'Wild Berry',
    icon: '🫐',
    description: 'Sweet berries loved by terrestrial creatures',
    price: 10,
    rarity: 'common',
  },
  {
    id: 'meat',
    name: 'Fresh Meat',
    icon: '🥩',
    description: 'Protein-rich food for carnivorous creatures',
    price: 25,
    rarity: 'uncommon',
  },
  {
    id: 'fish',
    name: 'Fresh Fish',
    icon: '🐟',
    description: 'Aquatic delicacy preferred by water creatures',
    price: 25,
    rarity: 'uncommon',
  },
  {
    id: 'crystal',
    name: 'Energy Crystal',
    icon: '💎',
    description: 'Crystallized energy for crystalline beings',
    price: 50,
    rarity: 'rare',
  },
  {
    id: 'energy',
    name: 'Pure Energy',
    icon: '✨',
    description: 'Condensed energy loved by ethereal creatures',
    price: 100,
    rarity: 'epic',
  },
]

/**
 * Get store item by ID
 */
export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((item) => item.id === id)
}
