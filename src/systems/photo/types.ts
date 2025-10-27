import type { CreatureInstance } from '@systems/creatures'

export interface PhotoResult {
  score: number
  creature: CreatureInstance | null
  creatureName: string
}

export interface PhotoCallbacks {
  onShutter?: () => void
  onFocus?: () => void
  onScore?: (score: number) => void
}

export interface ScoreBreakdown {
  centering: number
  size: number
  facing: number
  rarity: number
  total: number
}
