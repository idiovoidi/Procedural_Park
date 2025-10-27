/**
 * Creature Card Export - Usage Examples
 * 
 * This example demonstrates how to use the creature card export feature
 */

import { CreatureCardExporter, type CreatureCardMetadata } from '../src/systems/photo'
import type { CreatureInstance } from '../src/systems/creatures'

// Example 1: Export a creature card
async function exportCreatureExample(creature: CreatureInstance, worldSeed: number) {
  const exporter = new CreatureCardExporter()
  
  // Export the creature as a PNG with embedded metadata
  await exporter.exportCreatureCard(creature, worldSeed)
  
  console.log('Creature card exported successfully!')
  
  // Cleanup when done
  exporter.dispose()
}

// Example 2: Retrieve metadata from a previously exported card
function retrieveMetadataExample(creatureName: string) {
  const metadata = CreatureCardExporter.extractMetadata(creatureName)
  
  if (metadata) {
    console.log('Found creature card:', {
      name: metadata.creatureName,
      rarity: metadata.rarity,
      captureDate: metadata.captureDate,
      anatomy: metadata.anatomy
    })
  } else {
    console.log('No creature card found for:', creatureName)
  }
}

// Example 3: List all exported creature cards
function listAllCreatureCards() {
  const cards: CreatureCardMetadata[] = []
  
  // Search localStorage for all creature cards
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('creature-card-')) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const metadata = JSON.parse(data) as CreatureCardMetadata
          cards.push(metadata)
        } catch (e) {
          console.error('Failed to parse creature card:', key)
        }
      }
    }
  }
  
  console.log(`Found ${cards.length} creature cards:`)
  cards.forEach(card => {
    console.log(`- ${card.creatureName} (rarity: ${card.rarity.toFixed(2)})`)
  })
  
  return cards
}

// Example 4: Clear old creature cards
function clearOldCreatureCards(daysOld: number = 30) {
  const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
  let removedCount = 0
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith('creature-card-')) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const metadata = JSON.parse(data) as CreatureCardMetadata
          const captureTime = new Date(metadata.captureDate).getTime()
          
          if (captureTime < cutoffDate) {
            localStorage.removeItem(key)
            removedCount++
          }
        } catch (e) {
          // Remove corrupted entries
          localStorage.removeItem(key)
          removedCount++
        }
      }
    }
  }
  
  console.log(`Removed ${removedCount} old creature cards`)
}

// Example 5: Export creature card with custom handling
async function exportWithCustomHandling(
  creature: CreatureInstance,
  worldSeed: number,
  onSuccess: () => void,
  onError: (error: Error) => void
) {
  const exporter = new CreatureCardExporter()
  
  try {
    await exporter.exportCreatureCard(creature, worldSeed)
    onSuccess()
  } catch (error) {
    onError(error as Error)
  } finally {
    exporter.dispose()
  }
}

// Example 6: Compare creature anatomy
function compareCreatures(name1: string, name2: string) {
  const card1 = CreatureCardExporter.extractMetadata(name1)
  const card2 = CreatureCardExporter.extractMetadata(name2)
  
  if (!card1 || !card2) {
    console.log('One or both creatures not found')
    return
  }
  
  console.log('Comparison:')
  console.log(`${name1} vs ${name2}`)
  console.log('Archetype:', card1.anatomy.archetype, 'vs', card2.anatomy.archetype)
  console.log('Size:', card1.anatomy.size, 'vs', card2.anatomy.size)
  console.log('Rarity:', card1.rarity.toFixed(2), 'vs', card2.rarity.toFixed(2))
  console.log('Limbs:', card1.anatomy.limbCount, 'vs', card2.anatomy.limbCount)
  console.log('Wings:', card1.anatomy.wingCount, 'vs', card2.anatomy.wingCount)
}

export {
  exportCreatureExample,
  retrieveMetadataExample,
  listAllCreatureCards,
  clearOldCreatureCards,
  exportWithCustomHandling,
  compareCreatures
}
