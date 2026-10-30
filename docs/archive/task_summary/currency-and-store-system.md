# Currency and Food Store System

## Overview
Implemented a complete play money economy system with a food store building where players can purchase food items.

## Components Created

### Currency System (`src/systems/currency/`)
- **CurrencyManager.ts**: Manages player balance, transactions, and purchase logic
- **types.ts**: Currency, Transaction, and PurchaseResult interfaces
- **currency-rewards.ts**: Reward amounts for various activities (photos, feeding, discoveries)
- **index.ts**: Barrel export

### UI Components
- **currency-display.ts**: Top-right HUD element showing current balance with animated updates
- **food-store.ts**: Modal shop interface with grid layout, item cards, and purchase functionality

### Store Data
- **store-data.ts**: Defines purchasable items with prices matching food rarity

### Building
- **Food Store Building**: Added to `park-structures.ts` at position (-25, 0, 40)
  - Cream walls with red roof
  - Red awning over entrance
  - Display windows
  - Shopping cart and produce crates outside
  - Ambient lighting

## Features

### Currency Earning
- **Photos**: 5-50 coins based on score (40+, 60+, 80+)
- **Feeding**: 5 coins base, +10 if creature loves the food
- **Discoveries**: 10-200 coins based on creature rarity

### Store System
- Grid layout with item cards
- Color-coded affordability (green border = can afford, red = too expensive)
- Real-time balance updates
- Rarity badges (common, uncommon, rare, epic, legendary)
- Purchase confirmation via toast notifications

### Integration
- Currency display updates automatically on balance changes
- Store inventory syncs with food manager
- Keyboard shortcut: **O** to open/close store
- Transaction history tracking (last 100 transactions)

## Prices
- Wild Berry: 10 coins (common)
- Fresh Meat: 25 coins (uncommon)
- Fresh Fish: 25 coins (uncommon)
- Energy Crystal: 50 coins (rare)
- Pure Energy: 100 coins (epic)

## Controls
- **O**: Toggle food store
- **B**: Toggle food inventory
- **F**: Feed creature

## Technical Details
- Currency manager uses callback system for UI updates
- Store uses dynamic import for lazy loading
- All purchases validated through CurrencyManager.purchase()
- Serialization support for save/load system
