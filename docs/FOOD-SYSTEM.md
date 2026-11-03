# Food System

The food system allows players to feed creatures they encounter in the park, creating interactive gameplay and encouraging creature observation.

## Features

### Food Types

The game includes 5 different food types, each with varying effectiveness for different creature archetypes:

1. **Wild Berry** 🫐 (Common)
   - Best for: Terrestrial creatures
   - Effects: +10 happiness, +5 trust, 30% pose chance

2. **Fresh Meat** 🥩 (Uncommon)
   - Best for: Terrestrial and Aerial creatures
   - Effects: +15 happiness, +10 trust, 40% pose chance

3. **Fresh Fish** 🐟 (Uncommon)
   - Best for: Aquatic creatures
   - Effects: +15 happiness, +10 trust, 40% pose chance

4. **Energy Crystal** 💎 (Rare)
   - Best for: Crystalline creatures
   - Effects: +20 happiness, +15 trust, 50% pose chance

5. **Pure Energy** ✨ (Epic)
   - Best for: Ethereal creatures
   - Effects: +25 happiness, +20 trust, 60% pose chance

### Default Inventory (Testing)

For testing purposes, players start with:
- 10x Wild Berry
- 5x Fresh Meat
- 5x Fresh Fish
- 3x Energy Crystal
- 2x Pure Energy

## Controls

- **B** - Toggle Food Inventory
- **F** - Feed nearest creature (must have food selected)

## How to Use

1. Press **B** to open the food inventory
2. Click on a food item to select it
3. Get close to a creature (within 15 meters)
4. Press **F** to feed the creature
5. Watch the creature's reaction!

## Creature Reactions

Creatures react differently based on how much they like the food:

- **😍 Loved** (90%+ effectiveness) - Creature will likely pose for photos
- **😊 Liked** (70-89% effectiveness) - Creature becomes curious
- **😐 Neutral** (50-69% effectiveness) - Creature accepts the food
- **😕 Disliked** (<50% effectiveness) - Creature doesn't enjoy it much

## Feeding Mechanics

- **Distance**: Must be within 15 meters of a creature
- **Cooldown**: 5 seconds between feeding the same creature
- **Effectiveness**: Based on creature archetype and food type
- **Bonus Effects**: High effectiveness can make creatures pose for better photos

## Food Effectiveness by Archetype

| Food Type | Terrestrial | Aerial | Aquatic | Ethereal | Crystalline |
|-----------|-------------|--------|---------|----------|-------------|
| Berry     | 100%        | 70%    | 30%     | 50%      | 20%         |
| Meat      | 90%         | 80%    | 60%     | 20%      | 10%         |
| Fish      | 40%         | 60%    | 100%    | 30%      | 20%         |
| Crystal   | 30%         | 50%    | 40%     | 80%      | 100%        |
| Energy    | 20%         | 70%    | 30%     | 100%     | 80%         |

## Integration Points

### Code Structure

- **Food Manager**: `src/systems/food/FoodManager.ts`
- **Food Types**: `src/systems/food/types.ts`
- **Food Data**: `src/systems/food/food-data.ts`
- **UI Component**: `src/ui/components/food-inventory.ts`

### Game Integration

The food system is integrated into:
- Game loop (cooldown updates)
- Input system (B and Q keys)
- UI system (inventory display)
- Player stats (food shown in inventory)

## Future Enhancements

Potential improvements for the food system:

1. **Food Acquisition**: Add ways to find/buy food in the park
2. **Crafting**: Combine ingredients to create better food
3. **Creature Preferences**: Individual creatures remember favorite foods
4. **Feeding Achievements**: Unlock rewards for feeding different species
5. **Food Effects**: Temporary buffs like increased photo scores
6. **Rare Foods**: Special foods that attract rare creatures
7. **Food Spoilage**: Time-based degradation for realism
8. **Feeding Animations**: Visual feedback when creatures eat
