import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreatureInstance } from '../creatures'
import { FoodManager } from './FoodManager'

type Archetype = 'terrestrial' | 'aerial' | 'aquatic' | 'ethereal' | 'crystalline'

/** Minimal creature stand-in: only the fields FoodManager touches. */
function makeCreature(archetype: Archetype = 'terrestrial', x = 0): CreatureInstance {
  const group = new THREE.Group()
  group.position.set(x, 0, 0)
  return {
    group,
    anatomy: { archetype },
    behaviorState: 'idle',
    behaviorTimer: 0,
  } as unknown as CreatureInstance
}

function makeCamera(x = 0): THREE.Camera {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(x, 0, 0)
  return camera
}

const nameOf = () => 'Test Creature'

describe('FoodManager', () => {
  let food: FoodManager

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    food = new FoodManager()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('inventory', () => {
    it('starts with the default stock', () => {
      const quantities = Object.fromEntries(food.getInventory().map((i) => [i.id, i.quantity]))
      expect(quantities).toEqual({ berry: 10, meat: 5, fish: 5, crystal: 3, energy: 2 })
    })

    it('returns a copy of the inventory list', () => {
      food.getInventory().pop()
      expect(food.getInventory()).toHaveLength(5)
    })

    it('adds to an existing stack', () => {
      expect(food.addFood('berry', 3)).toBe(true)
      expect(food.getInventory().find((i) => i.id === 'berry')?.quantity).toBe(13)
    })

    it('adds a food that was used up', () => {
      food.removeFood('energy', 2)
      expect(food.getInventory().some((i) => i.id === 'energy')).toBe(false)
      expect(food.addFood('energy')).toBe(true)
      expect(food.getInventory().find((i) => i.id === 'energy')?.quantity).toBe(1)
    })

    it('rejects unknown food ids', () => {
      expect(food.addFood('pizza')).toBe(false)
    })

    it('removes food and refuses to remove more than is held', () => {
      expect(food.removeFood('meat', 2)).toBe(true)
      expect(food.getInventory().find((i) => i.id === 'meat')?.quantity).toBe(3)
      expect(food.removeFood('meat', 4)).toBe(false)
      expect(food.removeFood('pizza')).toBe(false)
    })

    it('drops a stack that reaches zero and deselects it', () => {
      food.selectFood('energy')
      food.removeFood('energy', 2)
      expect(food.getInventory().some((i) => i.id === 'energy')).toBe(false)
      expect(food.getSelectedFood()).toBeNull()
    })
  })

  describe('selection', () => {
    it('selects food that is in stock', () => {
      expect(food.selectFood('berry')).toBe(true)
      expect(food.getSelectedFood()?.id).toBe('berry')
    })

    it('rejects unknown or out-of-stock food and keeps the previous selection', () => {
      food.selectFood('berry')
      expect(food.selectFood('pizza')).toBe(false)
      expect(food.getSelectedFood()?.id).toBe('berry')
    })

    it('deselects', () => {
      food.selectFood('berry')
      food.deselectFood()
      expect(food.getSelectedFood()).toBeNull()
    })
  })

  describe('feedCreature', () => {
    it('does nothing without a selected food', () => {
      expect(food.feedCreature(makeCreature(), makeCamera(), nameOf)).toBeNull()
    })

    it('refuses creatures beyond 15 m and accepts them at exactly 15 m', () => {
      food.selectFood('berry')
      expect(food.feedCreature(makeCreature('terrestrial', 15.01), makeCamera(), nameOf)).toBeNull()
      expect(food.getInventory().find((i) => i.id === 'berry')?.quantity).toBe(10)
      expect(
        food.feedCreature(makeCreature('terrestrial', 15), makeCamera(), nameOf)
      ).not.toBeNull()
    })

    it('uses one food item and reports what was fed', () => {
      food.selectFood('berry')
      const result = food.feedCreature(makeCreature(), makeCamera(), nameOf)

      expect(result).toMatchObject({
        success: true,
        creatureName: 'Test Creature',
        effectivenessScore: 100,
      })
      expect(result?.foodUsed.id).toBe('berry')
      expect(food.getInventory().find((i) => i.id === 'berry')?.quantity).toBe(9)
    })

    it.each<[Archetype, number, string]>([
      ['terrestrial', 100, 'loved'], // berry 1.0
      ['aerial', 70, 'liked'], // berry 0.7 (threshold is inclusive)
      ['ethereal', 50, 'neutral'], // berry 0.5 (threshold is inclusive)
      ['aquatic', 30, 'disliked'], // berry 0.3
    ])('berry on a %s creature scores %i and is %s', (archetype, score, reaction) => {
      food.selectFood('berry')
      const result = food.feedCreature(makeCreature(archetype), makeCamera(), nameOf)
      expect(result?.effectivenessScore).toBe(score)
      expect(result?.creatureReaction).toBe(reaction)
    })

    it('makes the creature pose when the pose roll succeeds', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      food.selectFood('berry')
      const creature = makeCreature('terrestrial')

      const result = food.feedCreature(creature, makeCamera(), nameOf)

      expect(result?.bonusApplied).toBe(true)
      expect(creature.behaviorState).toBe('posing')
      expect(creature.behaviorTimer).toBeGreaterThanOrEqual(3)
    })

    it('makes a well-liked creature curious when the pose roll fails', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      food.selectFood('berry')
      const creature = makeCreature('terrestrial')

      const result = food.feedCreature(creature, makeCamera(), nameOf)

      expect(result?.bonusApplied).toBe(false)
      expect(creature.behaviorState).toBe('curious')
    })

    it('leaves a creature that dislikes the food alone when the pose roll fails', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      food.selectFood('berry')
      const creature = makeCreature('aquatic')

      food.feedCreature(creature, makeCamera(), nameOf)

      expect(creature.behaviorState).toBe('idle')
    })

    it('deselects the food when the last item is used', () => {
      food.selectFood('energy')
      const camera = makeCamera()
      food.feedCreature(makeCreature('ethereal'), camera, nameOf)
      food.feedCreature(makeCreature('ethereal'), camera, nameOf)

      expect(food.getSelectedFood()).toBeNull()
      expect(food.feedCreature(makeCreature('ethereal'), camera, nameOf)).toBeNull()
    })
  })

  describe('feeding cooldown', () => {
    it('blocks feeding the same creature again for 5 seconds', () => {
      food.selectFood('berry')
      const creature = makeCreature()
      const camera = makeCamera()

      expect(food.feedCreature(creature, camera, nameOf)).not.toBeNull()
      expect(food.canFeedCreature(creature)).toBe(false)
      expect(food.feedCreature(creature, camera, nameOf)).toBeNull()

      vi.advanceTimersByTime(4999)
      expect(food.canFeedCreature(creature)).toBe(false)

      vi.advanceTimersByTime(1)
      expect(food.canFeedCreature(creature)).toBe(true)
      expect(food.feedCreature(creature, camera, nameOf)).not.toBeNull()
    })

    it('does not consume food while a creature is on cooldown', () => {
      food.selectFood('berry')
      const creature = makeCreature()
      food.feedCreature(creature, makeCamera(), nameOf)
      food.feedCreature(creature, makeCamera(), nameOf)
      expect(food.getInventory().find((i) => i.id === 'berry')?.quantity).toBe(9)
    })

    it('tracks cooldowns per creature', () => {
      food.selectFood('berry')
      const camera = makeCamera()
      const a = makeCreature()
      const b = makeCreature()

      food.feedCreature(a, camera, nameOf)

      expect(food.canFeedCreature(a)).toBe(false)
      expect(food.canFeedCreature(b)).toBe(true)
    })

    it('reports the remaining cooldown in whole seconds, rounded up', () => {
      food.selectFood('berry')
      const creature = makeCreature()
      expect(food.getFeedingCooldown(creature)).toBe(0)

      food.feedCreature(creature, makeCamera(), nameOf)
      expect(food.getFeedingCooldown(creature)).toBe(5)

      vi.advanceTimersByTime(1500)
      expect(food.getFeedingCooldown(creature)).toBe(4)

      vi.advanceTimersByTime(3500)
      expect(food.getFeedingCooldown(creature)).toBe(0)
    })

    it('update() clears expired cooldowns only', () => {
      food.selectFood('berry')
      const camera = makeCamera()
      const early = makeCreature()
      const late = makeCreature()

      food.feedCreature(early, camera, nameOf)
      vi.advanceTimersByTime(3000)
      food.feedCreature(late, camera, nameOf)
      vi.advanceTimersByTime(2000)

      food.update()

      expect(food.getFeedingCooldown(early)).toBe(0)
      expect(food.getFeedingCooldown(late)).toBe(3)
    })
  })

  describe('clear and reset', () => {
    it('clear() empties inventory, selection and cooldowns', () => {
      food.selectFood('berry')
      const creature = makeCreature()
      food.feedCreature(creature, makeCamera(), nameOf)

      food.clear()

      expect(food.getInventory()).toEqual([])
      expect(food.getSelectedFood()).toBeNull()
      expect(food.getFeedingCooldown(creature)).toBe(0)
    })

    it('reset() restores the default stock and cooldowns', () => {
      food.selectFood('berry')
      const creature = makeCreature()
      food.feedCreature(creature, makeCamera(), nameOf)

      food.reset()

      expect(food.getInventory().find((i) => i.id === 'berry')?.quantity).toBe(10)
      expect(food.getSelectedFood()).toBeNull()
      expect(food.getFeedingCooldown(creature)).toBe(0)
    })
  })
})
