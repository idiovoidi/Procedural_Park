/**
 * Food Manager
 * Manages food inventory and feeding interactions
 */

import type { CreatureInstance } from '@systems/creatures'
import type * as THREE from 'three'
import { DEFAULT_FOOD_INVENTORY, FOOD_ITEMS } from './food-data'
import type { FeedingResult, FoodItem } from './types'

export class FoodManager {
  private inventory: FoodItem[] = []
  private selectedFood: FoodItem | null = null
  private feedingCooldown: Map<CreatureInstance, number> = new Map()
  private readonly COOLDOWN_DURATION = 5000 // 5 seconds between feedings

  constructor() {
    // Initialize with default inventory for testing
    this.inventory = DEFAULT_FOOD_INVENTORY.map((item) => ({ ...item }))
  }

  /**
   * Get current food inventory
   */
  public getInventory(): FoodItem[] {
    return [...this.inventory]
  }

  /**
   * Get selected food item
   */
  public getSelectedFood(): FoodItem | null {
    return this.selectedFood
  }

  /**
   * Select a food item for feeding
   */
  public selectFood(foodId: string): boolean {
    const food = this.inventory.find((item) => item.id === foodId && item.quantity > 0)
    if (food) {
      this.selectedFood = food
      return true
    }
    return false
  }

  /**
   * Deselect current food
   */
  public deselectFood(): void {
    this.selectedFood = null
  }

  /**
   * Add food to inventory
   */
  public addFood(foodId: string, quantity: number = 1): boolean {
    const foodData = FOOD_ITEMS[foodId]
    if (!foodData) return false

    const existing = this.inventory.find((item) => item.id === foodId)
    if (existing) {
      existing.quantity += quantity
    } else {
      this.inventory.push({ ...foodData, quantity })
    }
    return true
  }

  /**
   * Remove food from inventory
   */
  public removeFood(foodId: string, quantity: number = 1): boolean {
    const food = this.inventory.find((item) => item.id === foodId)
    if (!food || food.quantity < quantity) return false

    food.quantity -= quantity
    if (food.quantity === 0) {
      this.inventory = this.inventory.filter((item) => item.id !== foodId)
      if (this.selectedFood?.id === foodId) {
        this.selectedFood = null
      }
    }
    return true
  }

  /**
   * Check if creature can be fed
   */
  public canFeedCreature(creature: CreatureInstance): boolean {
    if (!this.selectedFood || this.selectedFood.quantity === 0) return false

    const cooldownEnd = this.feedingCooldown.get(creature)
    if (cooldownEnd && Date.now() < cooldownEnd) return false

    return true
  }

  /**
   * Feed a creature
   */
  public feedCreature(
    creature: CreatureInstance,
    camera: THREE.Camera,
    generateCreatureName: (creature: CreatureInstance) => string
  ): FeedingResult | null {
    if (!this.canFeedCreature(creature)) return null
    if (!this.selectedFood) return null

    // Check distance to creature
    const distance = camera.position.distanceTo(creature.group.position)
    if (distance > 15) return null

    // Calculate effectiveness based on creature archetype
    const archetype = creature.anatomy.archetype
    const effectiveness = this.selectedFood.effectiveness[archetype]

    // Determine creature reaction
    let reaction: 'loved' | 'liked' | 'neutral' | 'disliked'
    if (effectiveness >= 0.9) reaction = 'loved'
    else if (effectiveness >= 0.7) reaction = 'liked'
    else if (effectiveness >= 0.5) reaction = 'neutral'
    else reaction = 'disliked'

    // Apply effects to creature
    const bonusApplied = this.applyFeedingEffects(creature, this.selectedFood, effectiveness)

    // Remove food from inventory
    this.removeFood(this.selectedFood.id, 1)

    // Set cooldown
    this.feedingCooldown.set(creature, Date.now() + this.COOLDOWN_DURATION)

    const result: FeedingResult = {
      success: true,
      creatureName: generateCreatureName(creature),
      foodUsed: { ...this.selectedFood },
      effectivenessScore: Math.round(effectiveness * 100),
      creatureReaction: reaction,
      bonusApplied,
    }

    return result
  }

  /**
   * Apply feeding effects to creature
   */
  private applyFeedingEffects(
    creature: CreatureInstance,
    food: FoodItem,
    effectiveness: number
  ): boolean {
    // Make creature pose if effectiveness is high enough
    const poseChance = food.effects.poseChance * effectiveness
    if (Math.random() < poseChance) {
      creature.behaviorState = 'posing'
      creature.behaviorTimer = 3 + Math.random() * 2
      return true
    }

    // Otherwise make creature curious/happy
    if (effectiveness >= 0.7) {
      creature.behaviorState = 'curious'
      creature.behaviorTimer = 2 + Math.random() * 2
    }

    return false
  }

  /**
   * Update cooldowns
   */
  public update(): void {
    const now = Date.now()
    for (const [creature, cooldownEnd] of this.feedingCooldown.entries()) {
      if (now >= cooldownEnd) {
        this.feedingCooldown.delete(creature)
      }
    }
  }

  /**
   * Get feeding cooldown remaining for creature (in seconds)
   */
  public getFeedingCooldown(creature: CreatureInstance): number {
    const cooldownEnd = this.feedingCooldown.get(creature)
    if (!cooldownEnd) return 0

    const remaining = Math.max(0, cooldownEnd - Date.now())
    return Math.ceil(remaining / 1000)
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.inventory = []
    this.selectedFood = null
    this.feedingCooldown.clear()
  }

  /**
   * Reset to default inventory
   */
  public reset(): void {
    this.inventory = DEFAULT_FOOD_INVENTORY.map((item) => ({ ...item }))
    this.selectedFood = null
    this.feedingCooldown.clear()
  }
}
