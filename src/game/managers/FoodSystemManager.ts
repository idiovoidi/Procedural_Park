import { GAME_CONFIG } from '@core/constants'
import type { GameSystems } from '../SystemsCoordinator'

/**
 * FoodSystemManager
 * Wires the food inventory, store and currency to the UI, and handles feeding
 */
export class FoodSystemManager {
  private systems: GameSystems

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  /**
   * Initialize food system
   */
  public initialize(): void {
    const { ui, food, currency } = this.systems

    // Update UI with initial inventory
    ui.updateFoodInventory(food.getInventory())

    // Setup food selection callback
    ui.setOnFoodSelect((foodId) => {
      if (foodId) {
        food.selectFood(foodId)
        ui.showToast(`Selected ${food.getSelectedFood()?.name}`)
      } else {
        food.deselectFood()
        ui.showToast('Food deselected')
      }
    })

    // Initialize currency display
    ui.updateCurrency(currency.getBalance())

    // Setup currency balance change callback
    currency.onBalanceChange((balance) => {
      ui.updateCurrency(balance)
      ui.getFoodStore().updateBalance(balance)
    })

    // Setup store
    this.initializeStore()
  }

  /**
   * Initialize store system
   */
  private initializeStore(): void {
    const { ui, food, currency } = this.systems

    // Load store items
    import('@systems/food/store-data').then(({ STORE_ITEMS }) => {
      ui.getFoodStore().loadItems(STORE_ITEMS)
      ui.getFoodStore().updateBalance(currency.getBalance())
    })

    // Setup purchase callback
    ui.getFoodStore().setOnPurchase((itemId, price) => {
      const result = currency.purchase(price, itemId)

      if (result.success) {
        food.addFood(itemId, 1)
        ui.showToast(result.message)
        ui.updateFoodInventory(food.getInventory())
        return true
      } else {
        ui.showToast(result.message)
        return false
      }
    })
  }

  /**
   * Toggle food inventory
   */
  public toggleInventory(): void {
    this.systems.ui.toggleFoodInventory()
    this.systems.ui.updateFoodInventory(this.systems.food.getInventory())
  }

  /**
   * Toggle food store
   */
  public toggleStore(): void {
    this.systems.ui.toggleFoodStore()
  }

  /**
   * Feed nearest creature
   */
  public feedNearestCreature(): void {
    const { food, creatures, camera, photo, ui, currency } = this.systems

    const selectedFood = food.getSelectedFood()
    if (!selectedFood) {
      ui.showToast('❌ No food selected! Press B to open food inventory')
      return
    }

    if (selectedFood.quantity === 0) {
      ui.showToast(`❌ Out of ${selectedFood.name}`)
      return
    }

    // Find nearest creature
    const allCreatures = creatures.getAllCreatures()
    let nearestCreature = null
    let nearestDistance = Infinity

    for (const creature of allCreatures) {
      const distance = camera.camera.position.distanceTo(creature.group.position)
      if (distance < nearestDistance && distance < GAME_CONFIG.FEED_CREATURE_RANGE_M) {
        nearestDistance = distance
        nearestCreature = creature
      }
    }

    if (!nearestCreature) {
      ui.showToast(`❌ No creature nearby (get within ${GAME_CONFIG.FEED_CREATURE_RANGE_M}m)`)
      return
    }

    // Check cooldown
    if (!food.canFeedCreature(nearestCreature)) {
      const cooldown = food.getFeedingCooldown(nearestCreature)
      ui.showToast(`⏳ Wait ${cooldown}s before feeding again`)
      return
    }

    // Feed the creature
    const result = food.feedCreature(nearestCreature, camera.camera, (c) =>
      photo.generateCreatureName(c)
    )

    if (result) {
      // Feeding a wild creature also builds its trust, which is what lets it be crated
      this.systems.capture.onFed(nearestCreature, result.foodUsed.id)

      // Show feedback based on reaction
      const reactionEmojis = {
        loved: '😍',
        liked: '😊',
        neutral: '😐',
        disliked: '😕',
      }

      const emoji = reactionEmojis[result.creatureReaction]
      const message = `${emoji} ${result.creatureName} ${result.creatureReaction} the ${result.foodUsed.name}!`

      if (result.bonusApplied) {
        ui.showToast(`${message} (Posing!)`)
      } else {
        ui.showToast(message)
      }

      // Award currency for feeding
      import('@systems/currency/currency-rewards').then(({ CURRENCY_REWARDS }) => {
        let reward = CURRENCY_REWARDS.FEED_CREATURE
        if (result.creatureReaction === 'loved') {
          reward += CURRENCY_REWARDS.CREATURE_LOVED_FOOD
        }
        currency.addMoney(reward, `Fed ${result.creatureName}`)
        ui.showToast(`+${reward} 🪙`)
      })

      // Update inventory UI
      ui.updateFoodInventory(food.getInventory())
      ui.setSelectedFood(food.getSelectedFood()?.id || null)

      // Play sound effect
      if (result.creatureReaction === 'loved' || result.creatureReaction === 'liked') {
        this.systems.audio.playSoundEffect('creature_chirp')
      }
    }
  }
}
