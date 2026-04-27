import type { PatternType } from '@rendering/textures'
import type * as THREE from 'three'
import type { InteractionPoint } from '@rendering/scene/environment-interactions'

export type CreatureArchetype = 'terrestrial' | 'aerial' | 'aquatic' | 'ethereal' | 'crystalline'

export type BodyType = 'chubby' | 'sleek' | 'muscular' | 'lanky' | 'compact' | 'bulky'

export type Anatomy = {
  archetype: CreatureArchetype
  torsoShape: 'sphere' | 'ellipsoid' | 'capsule' | 'box' | 'crystal' | 'cloud'
  bodyType: BodyType
  hasHead: boolean
  headSize: number
  eyeCount: number
  eyeSize: number
  limbCount: number
  limbType: 'leg' | 'arm' | 'fin' | 'tendril' | 'crystal_shard'
  wingCount: number
  wingType: 'feather' | 'membrane' | 'energy' | 'crystal'
  tailCount: number
  tailType: 'fur' | 'scale' | 'energy' | 'crystal' | 'feather'
  antennaCount: number
  antennaType: 'simple' | 'feathered' | 'crystal' | 'energy'
  earCount: number
  earType: 'pointed' | 'round' | 'floppy' | 'fin' | 'none'
  hornCount: number
  hornType: 'straight' | 'curved' | 'spiral' | 'antler' | 'none'
  spineCount: number
  spineType: 'back' | 'neck' | 'tail' | 'none'
  furTufts: boolean
  hasScales: boolean
  pattern: PatternType
  patternColor: THREE.Color
  bellyColor: THREE.Color
  baseHue: number
  rarity: number
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  temperament: 'shy' | 'curious' | 'aggressive' | 'playful' | 'territorial'
}

export type BehaviorState =
  | 'idle'
  | 'curious'
  | 'shy'
  | 'posing'
  | 'feeding'
  | 'territorial'
  | 'herding'
  | 'fleeing'
  | 'playing'
  | 'perching'
  | 'hiding'
  | 'drinking'
  | 'resting'
  | 'wandering'

export type CreatureInstance = {
  group: THREE.Group
  anchor: THREE.Vector3
  timeOffset: number
  rarity: number
  anatomy: Anatomy
  behaviorState: BehaviorState
  behaviorTimer: number
  socialGroup?: CreatureInstance[]
  territoryCenter?: THREE.Vector3
  territoryRadius?: number
  currentInteraction?: InteractionPoint | null
  interactionStartTime?: number | null
  update: (
    dtSeconds: number,
    tSeconds: number,
    camera?: THREE.Camera,
    allCreatures?: CreatureInstance[]
  ) => void
  reactToPhoto: () => void
  getDistanceTo: (other: CreatureInstance) => number
  isInTerritory: (position: THREE.Vector3) => boolean
}
