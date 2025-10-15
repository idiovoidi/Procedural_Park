import * as THREE from 'three'
import { createPatternTexture, type PatternType } from './textures'
import {
  updateBehaviorState as updateBehaviorStateLogic,
  updateMovement,
  getMouthOpenAmount,
  getWingFlapSpeedMultiplier,
  applyBehaviorEffects,
  type BehaviorContext,
  type BehaviorState_Internal,
} from './creature_behaviour'

export type Random = () => number

export function createRng(seed: number): Random {
  let state = seed >>> 0
  return () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 0xffffffff
}

function choose<T>(rand: Random, items: T[]): T {
  return items[Math.floor(rand() * items.length)]
}

function rangeInt(rand: Random, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

function normalish(rand: Random): number {
  // Box–Muller-like without expensive trig; sum of uniforms -> approx normal
  return (rand() + rand() + rand() + rand()) / 4
}

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
  currentInteraction?: any
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

export function generateAnatomy(rand: Random): Anatomy {
  const baseHue = rand()
  const rarity = rand()

  // Determine archetype first, as it influences other traits
  const archetype = choose(rand, [
    'terrestrial',
    'aerial',
    'aquatic',
    'ethereal',
    'crystalline',
  ] as const)

  // Archetype-influenced traits
  const torsoShape = getArchetypeShape(archetype, rand)
  const bodyType = getArchetypeBodyType(archetype, rand)
  const size = getArchetypeSize(archetype, rand)
  const temperament = getArchetypeTemperament(archetype, rand)

  const hasHead = archetype !== 'ethereal' || rand() > 0.3
  const eyeCount =
    archetype === 'crystalline'
      ? rangeInt(rand, 1, 8)
      : archetype === 'ethereal'
        ? rangeInt(rand, 0, 4)
        : rand() > 0.8
          ? rangeInt(rand, 3, 6)
          : 2

  const limbType = getArchetypeLimbType(archetype, rand)
  const limbCount = getArchetypeLimbCount(archetype, limbType, rand)

  const wingCount = getArchetypeWingCount(archetype, rand)
  const wingType = getArchetypeWingType(archetype, rand)

  const tailCount = rand() > 0.6 ? rangeInt(rand, 1, 2) : 0
  const tailType = getArchetypeTailType(archetype, rand)

  const antennaCount = hasHead && rand() > 0.5 ? rangeInt(rand, 1, 4) : 0
  const antennaType = getArchetypeAntennaType(archetype, rand)

  // New decorative features - increased probabilities for visibility
  const earCount = hasHead && rand() > 0.3 ? 2 : 0
  const earType = getArchetypeEarType(archetype, rand)

  const hornCount = hasHead && rand() > 0.5 ? rangeInt(rand, 1, 3) : 0
  const hornType = getArchetypeHornType(archetype, rand)

  const spineCount = rand() > 0.4 ? rangeInt(rand, 4, 10) : 0
  const spineType = getArchetypeSpineType(archetype, rand)

  const furTufts = archetype === 'terrestrial' && rand() > 0.5
  const hasScales = (archetype === 'aquatic' || archetype === 'terrestrial') && rand() > 0.4

  // Pattern and color variations
  const pattern = getArchetypePattern(archetype, rand)
  const patternColor = new THREE.Color().setHSL(
    (baseHue + 0.5 + (rand() - 0.5) * 0.2) % 1,
    0.7,
    0.4
  )
  const bellyColor = new THREE.Color().setHSL(baseHue, 0.3, 0.75)

  return {
    archetype,
    torsoShape,
    bodyType,
    hasHead,
    headSize: hasHead ? 0.5 + rand() * 0.8 : 0,
    eyeCount,
    eyeSize: hasHead ? 0.06 + rand() * 0.12 : 0,
    limbCount,
    limbType,
    wingCount,
    wingType,
    tailCount,
    tailType,
    antennaCount,
    antennaType,
    earCount,
    earType,
    hornCount,
    hornType,
    spineCount,
    spineType,
    furTufts,
    hasScales,
    pattern,
    patternColor,
    bellyColor,
    baseHue,
    rarity,
    size,
    temperament,
  }
}

function getArchetypeShape(archetype: CreatureArchetype, rand: Random): Anatomy['torsoShape'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['sphere', 'ellipsoid', 'capsule', 'box'])
    case 'aerial':
      return choose(rand, ['ellipsoid', 'capsule'])
    case 'aquatic':
      return choose(rand, ['ellipsoid', 'capsule'])
    case 'ethereal':
      return choose(rand, ['cloud', 'sphere'])
    case 'crystalline':
      return choose(rand, ['crystal', 'box'])
  }
}

function getArchetypeBodyType(archetype: CreatureArchetype, rand: Random): BodyType {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['chubby', 'muscular', 'compact', 'bulky'])
    case 'aerial':
      return choose(rand, ['sleek', 'lanky', 'compact'])
    case 'aquatic':
      return choose(rand, ['sleek', 'muscular', 'bulky'])
    case 'ethereal':
      return choose(rand, ['lanky', 'sleek', 'compact'])
    case 'crystalline':
      return choose(rand, ['compact', 'bulky', 'lanky'])
  }
}

function getArchetypeSize(archetype: CreatureArchetype, rand: Random): Anatomy['size'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['small', 'medium', 'large'])
    case 'aerial':
      return choose(rand, ['tiny', 'small', 'medium'])
    case 'aquatic':
      return choose(rand, ['medium', 'large', 'huge'])
    case 'ethereal':
      return choose(rand, ['small', 'medium', 'large'])
    case 'crystalline':
      return choose(rand, ['tiny', 'small', 'medium'])
  }
}

function getArchetypeTemperament(
  archetype: CreatureArchetype,
  rand: Random
): Anatomy['temperament'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['shy', 'curious', 'territorial'])
    case 'aerial':
      return choose(rand, ['playful', 'curious', 'shy'])
    case 'aquatic':
      return choose(rand, ['curious', 'territorial', 'aggressive'])
    case 'ethereal':
      return choose(rand, ['shy', 'playful', 'curious'])
    case 'crystalline':
      return choose(rand, ['territorial', 'aggressive', 'curious'])
  }
}

function getArchetypeLimbType(archetype: CreatureArchetype, rand: Random): Anatomy['limbType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['leg', 'arm'])
    case 'aerial':
      return choose(rand, ['leg', 'arm'])
    case 'aquatic':
      return choose(rand, ['fin', 'tendril'])
    case 'ethereal':
      return choose(rand, ['tendril', 'arm'])
    case 'crystalline':
      return choose(rand, ['crystal_shard', 'leg'])
  }
}

function getArchetypeLimbCount(
  archetype: CreatureArchetype,
  limbType: Anatomy['limbType'],
  rand: Random
): number {
  switch (archetype) {
    case 'terrestrial':
      // Most terrestrial animals have 4 legs, some have 2 or 6
      if (limbType === 'leg') {
        const roll = rand()
        if (roll < 0.7) return 4 // Most common
        if (roll < 0.85) return 2 // Bipedal
        return 6 // Insect-like
      }
      return rangeInt(rand, 0, 2)
    case 'aerial':
      // Birds typically have 2 legs
      if (limbType === 'leg') return 2
      return rangeInt(rand, 0, 2)
    case 'aquatic':
      // Fish have fins, varying amounts
      return rangeInt(rand, 2, 6)
    case 'ethereal':
      // Ethereal creatures can have any number
      return rangeInt(rand, 0, 6)
    case 'crystalline':
      // Crystalline creatures have many shards
      return rangeInt(rand, 3, 12)
  }
}

function getArchetypeWingCount(archetype: CreatureArchetype, rand: Random): number {
  switch (archetype) {
    case 'terrestrial':
      return rand() > 0.8 ? rangeInt(rand, 2, 4) : 0
    case 'aerial':
      return rangeInt(rand, 2, 6)
    case 'aquatic':
      return rand() > 0.7 ? rangeInt(rand, 2, 4) : 0
    case 'ethereal':
      return rangeInt(rand, 0, 8)
    case 'crystalline':
      return rand() > 0.6 ? rangeInt(rand, 2, 6) : 0
  }
}

function getArchetypeWingType(archetype: CreatureArchetype, rand: Random): Anatomy['wingType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['feather', 'membrane'])
    case 'aerial':
      return choose(rand, ['feather', 'membrane'])
    case 'aquatic':
      return choose(rand, ['membrane', 'feather'])
    case 'ethereal':
      return choose(rand, ['energy', 'membrane'])
    case 'crystalline':
      return choose(rand, ['crystal', 'membrane'])
  }
}

function getArchetypeTailType(archetype: CreatureArchetype, rand: Random): Anatomy['tailType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['fur', 'scale'])
    case 'aerial':
      return choose(rand, ['feather', 'fur'])
    case 'aquatic':
      return choose(rand, ['scale', 'fur'])
    case 'ethereal':
      return choose(rand, ['energy', 'fur'])
    case 'crystalline':
      return choose(rand, ['crystal', 'scale'])
  }
}

function getArchetypeAntennaType(
  archetype: CreatureArchetype,
  rand: Random
): Anatomy['antennaType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['simple', 'feathered'])
    case 'aerial':
      return choose(rand, ['feathered', 'simple'])
    case 'aquatic':
      return choose(rand, ['simple', 'feathered'])
    case 'ethereal':
      return choose(rand, ['energy', 'simple'])
    case 'crystalline':
      return choose(rand, ['crystal', 'simple'])
  }
}

function getArchetypeEarType(archetype: CreatureArchetype, rand: Random): Anatomy['earType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['pointed', 'round', 'floppy'])
    case 'aerial':
      return choose(rand, ['pointed', 'round'])
    case 'aquatic':
      return choose(rand, ['fin', 'none'])
    case 'ethereal':
      return choose(rand, ['pointed', 'none'])
    case 'crystalline':
      return 'none'
  }
}

function getArchetypeHornType(archetype: CreatureArchetype, rand: Random): Anatomy['hornType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['straight', 'curved', 'antler'])
    case 'aerial':
      return choose(rand, ['straight', 'curved'])
    case 'aquatic':
      return choose(rand, ['straight', 'spiral'])
    case 'ethereal':
      return choose(rand, ['spiral', 'straight'])
    case 'crystalline':
      return choose(rand, ['straight', 'spiral'])
  }
}

function getArchetypeSpineType(archetype: CreatureArchetype, rand: Random): Anatomy['spineType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['back', 'neck'])
    case 'aerial':
      return choose(rand, ['neck', 'tail'])
    case 'aquatic':
      return choose(rand, ['back', 'tail'])
    case 'ethereal':
      return 'none'
    case 'crystalline':
      return choose(rand, ['back', 'neck', 'tail'])
  }
}

function getArchetypePattern(archetype: CreatureArchetype, rand: Random): PatternType {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['solid', 'spots', 'stripes', 'patches', 'tiger', 'leopard'])
    case 'aerial':
      return choose(rand, ['solid', 'gradient', 'stripes', 'spots'])
    case 'aquatic':
      return choose(rand, ['solid', 'stripes', 'gradient', 'spots'])
    case 'ethereal':
      return choose(rand, ['gradient', 'solid'])
    case 'crystalline':
      return choose(rand, ['solid', 'gradient'])
  }
}

function getBodyTypeScale(bodyType: BodyType): { width: number; height: number; length: number } {
  switch (bodyType) {
    case 'chubby':
      return { width: 1.3, height: 1.1, length: 0.9 } // Wide, short
    case 'sleek':
      return { width: 0.8, height: 0.9, length: 1.3 } // Narrow, long
    case 'muscular':
      return { width: 1.2, height: 1.1, length: 1.1 } // Broad, powerful
    case 'lanky':
      return { width: 0.7, height: 1.3, length: 1.0 } // Thin, tall
    case 'compact':
      return { width: 0.9, height: 0.8, length: 0.9 } // Small, dense
    case 'bulky':
      return { width: 1.4, height: 1.2, length: 1.0 } // Very wide and tall
  }
}

function buildTorso(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color }
): THREE.Object3D {
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // Create procedural texture for pattern
  const patternTexture = createPatternTexture(
    anatomy.pattern,
    palette.base,
    anatomy.patternColor,
    anatomy.rarity * 10000
  )

  // Create material with pattern texture
  const material = getArchetypeMaterial(anatomy.archetype, palette, rand, patternTexture)

  // Get body type scale modifiers
  const bodyScale = getBodyTypeScale(anatomy.bodyType)

  switch (anatomy.torsoShape) {
    case 'sphere': {
      // Round body like a bird or small mammal
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.6 * sizeMultiplier, 28, 28), material)
      body.scale.set(1.0 * bodyScale.width, 0.9 * bodyScale.height, 1.1 * bodyScale.length)
      return body
    }
    case 'ellipsoid': {
      // Streamlined body for aerial/aquatic creatures
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5 * sizeMultiplier, 28, 28), material)
      body.scale.set(0.7 * bodyScale.width, 0.6 * bodyScale.height, 1.3 * bodyScale.length)
      return body
    }
    case 'capsule': {
      // Mammal-like body
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.4 * sizeMultiplier * bodyScale.width,
          0.8 * sizeMultiplier * bodyScale.length,
          8,
          16
        ),
        material
      )
      body.rotation.z = Math.PI / 2 // Horizontal orientation
      body.scale.y = bodyScale.height
      return body
    }
    case 'box': {
      // Sturdy terrestrial body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.8 * sizeMultiplier * bodyScale.width,
          0.6 * sizeMultiplier * bodyScale.height,
          1.0 * sizeMultiplier * bodyScale.length,
          4,
          4,
          4
        ),
        material
      )
      return body
    }
    case 'crystal': {
      const crystalGeometry = new THREE.OctahedronGeometry((0.8 + rand() * 0.4) * sizeMultiplier, 1)
      const crystalMesh = new THREE.Mesh(crystalGeometry, material)
      crystalMesh.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
      return crystalMesh
    }
    case 'cloud': {
      const cloudGroup = new THREE.Group()
      const cloudMaterial = new THREE.MeshStandardMaterial({
        color: palette.base,
        transparent: true,
        opacity: 0.7,
        metalness: 0.1,
        roughness: 0.9,
      })

      // Create multiple spheres for cloud effect
      for (let i = 0; i < 5 + Math.floor(rand() * 3); i++) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry((0.3 + rand() * 0.4) * sizeMultiplier, 16, 16),
          cloudMaterial
        )
        sphere.position.set(
          (rand() - 0.5) * 1.5 * sizeMultiplier,
          (rand() - 0.5) * 0.8 * sizeMultiplier,
          (rand() - 0.5) * 1.5 * sizeMultiplier
        )
        cloudGroup.add(sphere)
      }
      return cloudGroup
    }
    default:
      return new THREE.Mesh(
        new THREE.SphereGeometry((0.9 + rand() * 0.6) * sizeMultiplier, 28, 28),
        material
      )
  }
}

function getSizeMultiplier(size: Anatomy['size']): number {
  switch (size) {
    case 'tiny':
      return 0.5
    case 'small':
      return 0.75
    case 'medium':
      return 1.0
    case 'large':
      return 1.5
    case 'huge':
      return 2.0
  }
}

function getArchetypeMaterial(
  archetype: CreatureArchetype,
  palette: { base: THREE.Color; accent: THREE.Color },
  rand: Random,
  texture?: THREE.Texture
): THREE.MeshStandardMaterial {
  const baseProps = texture ? { map: texture } : { color: palette.base }

  switch (archetype) {
    case 'terrestrial':
      return new THREE.MeshStandardMaterial({ ...baseProps, metalness: 0.1, roughness: 0.8 })
    case 'aerial':
      return new THREE.MeshStandardMaterial({ ...baseProps, metalness: 0.2, roughness: 0.6 })
    case 'aquatic':
      return new THREE.MeshStandardMaterial({ ...baseProps, metalness: 0.4, roughness: 0.3 })
    case 'ethereal':
      return new THREE.MeshStandardMaterial({
        ...baseProps,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.9,
        emissive: new THREE.Color(palette.base).multiplyScalar(0.1),
      })
    case 'crystalline':
      return new THREE.MeshStandardMaterial({
        ...baseProps,
        metalness: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(palette.base).multiplyScalar(0.05),
      })
  }
}

function buildHead(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color }
): THREE.Object3D | null {
  if (!anatomy.hasHead) return null

  const headGroup = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: palette.base,
    metalness: 0.2,
    roughness: 0.5,
  })

  // Adjust head size based on body type
  const bodyScale = getBodyTypeScale(anatomy.bodyType)
  const headSizeMultiplier =
    anatomy.bodyType === 'chubby'
      ? 0.9
      : anatomy.bodyType === 'bulky'
        ? 0.85
        : anatomy.bodyType === 'compact'
          ? 1.1
          : anatomy.bodyType === 'lanky'
            ? 0.8
            : 1.0

  // Create more animal-like head shapes based on archetype
  let headMesh: THREE.Mesh

  switch (anatomy.archetype) {
    case 'terrestrial':
    case 'aerial': {
      // Bird/mammal-like head - slightly elongated with snout
      const headGeom = new THREE.SphereGeometry(anatomy.headSize * 0.8 * headSizeMultiplier, 24, 24)
      headMesh = new THREE.Mesh(headGeom, material)
      headMesh.scale.set(0.9, 1.0, 1.2) // Elongated forward for snout/beak

      // Add snout/beak
      const snoutGeom = new THREE.ConeGeometry(
        anatomy.headSize * 0.3 * headSizeMultiplier,
        anatomy.headSize * 0.5 * headSizeMultiplier,
        12
      )
      const snout = new THREE.Mesh(snoutGeom, material)
      snout.rotation.x = Math.PI / 2
      snout.position.set(0, -anatomy.headSize * 0.2, anatomy.headSize * 0.9 * headSizeMultiplier)
      headGroup.add(snout)
      break
    }
    case 'aquatic': {
      // Fish-like head - streamlined
      const headGeom = new THREE.SphereGeometry(anatomy.headSize * 0.9 * headSizeMultiplier, 24, 24)
      headMesh = new THREE.Mesh(headGeom, material)
      headMesh.scale.set(0.8, 0.8, 1.3) // Very elongated
      break
    }
    default: {
      // Default rounded head
      const headGeom = new THREE.SphereGeometry(anatomy.headSize * 0.8, 24, 24)
      headMesh = new THREE.Mesh(headGeom, material)
      break
    }
  }

  headGroup.add(headMesh)

  // Adjust head/neck position based on body type
  const neckHeight =
    anatomy.bodyType === 'lanky'
      ? 0.7
      : anatomy.bodyType === 'chubby'
        ? 0.3
        : anatomy.bodyType === 'bulky'
          ? 0.4
          : anatomy.bodyType === 'sleek'
            ? 0.6
            : 0.5

  headGroup.position.set(0, neckHeight, 0.7)

  return headGroup
}

function buildEyes(rand: Random, anatomy: Anatomy, head: THREE.Object3D | null): THREE.Object3D[] {
  if (!head || anatomy.eyeCount <= 0) return []
  const eyes: THREE.Object3D[] = []

  // Position eyes based on creature type
  const eyePositions: Array<{ x: number; y: number; z: number }> = []

  if (anatomy.eyeCount === 2) {
    // Standard bilateral eyes
    const separation = anatomy.headSize * 0.5
    eyePositions.push(
      { x: -separation, y: anatomy.headSize * 0.2, z: anatomy.headSize * 0.6 },
      { x: separation, y: anatomy.headSize * 0.2, z: anatomy.headSize * 0.6 }
    )
  } else {
    // Multiple eyes arranged in a pattern
    for (let i = 0; i < anatomy.eyeCount; i++) {
      const theta = (i / anatomy.eyeCount) * Math.PI * 1.2 - Math.PI * 0.6
      eyePositions.push({
        x: Math.sin(theta) * anatomy.headSize * 0.5,
        y: anatomy.headSize * 0.15 + normalish(rand) * 0.1,
        z: anatomy.headSize * 0.5 + Math.cos(theta) * 0.1,
      })
    }
  }

  for (let i = 0; i < Math.min(anatomy.eyeCount, eyePositions.length); i++) {
    const eyeSize = anatomy.eyeSize * 1.2

    // Eye white (slightly oval for more natural look)
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(eyeSize, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.4 })
    )
    eyeWhite.scale.set(1.0, 0.9, 1.1)

    // Iris (colored ring around pupil)
    const irisColor = new THREE.Color().setHSL(anatomy.baseHue, 0.6, 0.4)
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(eyeSize * 0.5, 12, 12),
      new THREE.MeshStandardMaterial({
        color: irisColor,
        metalness: 0.2,
        roughness: 0.6,
      })
    )
    iris.position.z = eyeSize * 0.5

    // Pupil (black center) - made larger and more prominent
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(eyeSize * 0.25, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 1,
        emissive: 0x000000,
      })
    )
    pupil.position.z = eyeSize * 0.7 // Much further forward to be clearly visible
    pupil.name = 'pupil'

    const eye = new THREE.Group()
    eye.add(eyeWhite)
    eye.add(iris)
    eye.add(pupil)

    // Store references for eye tracking
    eye.userData.pupil = pupil
    eye.userData.iris = iris
    eye.userData.maxOffset = eyeSize * 0.15 // Max distance pupil can move

    const pos = eyePositions[i]
    eye.position.set(pos.x, pos.y, pos.z)

    head.add(eye)
    eyes.push(eye)
  }

  return eyes
}

function buildLimbs(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  torso: THREE.Object3D
): THREE.Object3D[] {
  const limbs: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const bodyScale = getBodyTypeScale(anatomy.bodyType)

  // Adjust limb thickness based on body type
  const limbThicknessMultiplier =
    anatomy.bodyType === 'muscular'
      ? 1.3
      : anatomy.bodyType === 'bulky'
        ? 1.4
        : anatomy.bodyType === 'chubby'
          ? 1.2
          : anatomy.bodyType === 'lanky'
            ? 0.7
            : anatomy.bodyType === 'sleek'
              ? 0.8
              : 1.0 // compact

  for (let i = 0; i < anatomy.limbCount; i++) {
    const limbGroup = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: palette.accent,
      metalness: 0.1,
      roughness: 0.6,
    })

    switch (anatomy.limbType) {
      case 'leg': {
        // Two-segment leg (thigh + shin)
        const thighLength = 0.4 * sizeMultiplier * (anatomy.bodyType === 'lanky' ? 1.3 : 1.0)
        const shinLength = 0.35 * sizeMultiplier * (anatomy.bodyType === 'lanky' ? 1.3 : 1.0)
        const thickness = 0.08 * sizeMultiplier * limbThicknessMultiplier

        const thigh = new THREE.Mesh(
          new THREE.CapsuleGeometry(thickness, thighLength, 6, 8),
          material
        )
        thigh.position.y = -thighLength / 2

        const shin = new THREE.Mesh(
          new THREE.CapsuleGeometry(thickness * 0.8, shinLength, 6, 8),
          material
        )
        shin.position.y = -thighLength - shinLength / 2

        // Simple foot
        const foot = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.2, 8, 8), material)
        foot.scale.set(1.2, 0.6, 1.5)
        foot.position.y = -thighLength - shinLength

        limbGroup.add(thigh)
        limbGroup.add(shin)
        limbGroup.add(foot)
        break
      }
      case 'arm': {
        // Arm with hand
        const armLength = 0.5 * sizeMultiplier * (anatomy.bodyType === 'lanky' ? 1.2 : 1.0)
        const thickness = 0.07 * sizeMultiplier * limbThicknessMultiplier

        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(thickness, armLength, 6, 8), material)
        arm.position.y = -armLength / 2

        const hand = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.3, 8, 8), material)
        hand.position.y = -armLength

        limbGroup.add(arm)
        limbGroup.add(hand)
        break
      }
      case 'fin': {
        // Flat fin shape
        const finLength = 0.6 * sizeMultiplier
        const finWidth = 0.4 * sizeMultiplier

        const fin = new THREE.Mesh(
          new THREE.ConeGeometry(finWidth, finLength, 3),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        fin.rotation.x = Math.PI / 2
        limbGroup.add(fin)
        break
      }
      case 'tendril': {
        // Segmented tentacle
        const segments = 4
        let parent: THREE.Object3D = limbGroup
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(
              0.05 * sizeMultiplier * (1 - s / segments),
              0.2 * sizeMultiplier,
              4,
              6
            ),
            material
          )
          seg.position.y = -0.18 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
        break
      }
      default: {
        const limb = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.08 * sizeMultiplier, 0.5 * sizeMultiplier, 6, 12),
          material
        )
        limbGroup.add(limb)
      }
    }

    // Position limbs around body
    const theta = (i / Math.max(1, anatomy.limbCount)) * Math.PI * 2
    const radius = 0.5 * sizeMultiplier
    limbGroup.position.set(
      Math.cos(theta) * radius,
      -0.2 * sizeMultiplier,
      Math.sin(theta) * radius
    )

    // Angle limbs outward naturally
    limbGroup.rotation.z = Math.cos(theta) * 0.3
    limbGroup.rotation.x = Math.sin(theta) * 0.3

    limbs.push(limbGroup)
    ;(torso as THREE.Object3D).add(limbGroup)
  }
  return limbs
}

function buildMouth(
  rand: Random,
  anatomy: Anatomy,
  head: THREE.Object3D | null,
  palette: { base: THREE.Color; accent: THREE.Color }
): { mouth: THREE.Group | null; lowerJaw: THREE.Mesh | null } {
  if (!head) return { mouth: null, lowerJaw: null }
  const mouth = new THREE.Group()
  // Upper lip (static)
  const upper = new THREE.Mesh(
    new THREE.CapsuleGeometry(anatomy.eyeSize * 0.6, anatomy.eyeSize * 0.1, 4, 8),
    new THREE.MeshStandardMaterial({ color: palette.base, metalness: 0.2, roughness: 0.6 })
  )
  upper.position.set(0, -anatomy.headSize * 0.3, anatomy.headSize * 0.9)
  mouth.add(upper)
  // Lower jaw (animated)
  const lowerJaw = new THREE.Mesh(
    new THREE.BoxGeometry(anatomy.eyeSize * 1.6, anatomy.eyeSize * 0.5, anatomy.eyeSize * 0.9),
    new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.1, roughness: 0.5 })
  )
  lowerJaw.position.set(0, -anatomy.headSize * 0.37, anatomy.headSize * 0.78)
  lowerJaw.rotation.x = -0.1
  mouth.add(lowerJaw)
  head.add(mouth)
  return { mouth, lowerJaw }
}

function buildWings(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  torso: THREE.Object3D
): THREE.Object3D[] {
  const wings: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.wingCount; i++) {
    const wingGroup = new THREE.Group()
    const side = i % 2 === 0 ? -1 : 1

    switch (anatomy.wingType) {
      case 'feather': {
        // Bird-like feathered wing with segments
        const wingLength = (1.0 + rand() * 0.3) * sizeMultiplier
        const wingWidth = (0.6 + rand() * 0.2) * sizeMultiplier

        // Main wing surface
        const mainWing = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength, wingWidth, 4, 2),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            metalness: 0.1,
            roughness: 0.6,
          })
        )
        mainWing.rotation.y = side * Math.PI * 0.15

        // Wing tip feathers
        const tipFeathers = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength * 0.4, wingWidth * 0.8, 2, 3),
          new THREE.MeshStandardMaterial({
            color: palette.base,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        tipFeathers.position.x = side * wingLength * 0.5
        tipFeathers.rotation.y = side * Math.PI * 0.2

        wingGroup.add(mainWing)
        wingGroup.add(tipFeathers)
        break
      }
      case 'membrane': {
        // Bat-like membrane wing
        const wingLength = (0.9 + rand() * 0.3) * sizeMultiplier
        const wingWidth = (0.5 + rand() * 0.2) * sizeMultiplier

        const membrane = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength, wingWidth, 3, 2),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            metalness: 0.2,
            roughness: 0.5,
          })
        )

        // Wing bones/fingers
        for (let b = 0; b < 3; b++) {
          const bone = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.02 * sizeMultiplier, wingLength * 0.8, 4, 6),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          bone.position.set(side * wingLength * 0.3, wingWidth * (b / 3 - 0.33), 0.01)
          bone.rotation.z = side * Math.PI * 0.5
          wingGroup.add(bone)
        }

        wingGroup.add(membrane)
        break
      }
      case 'energy': {
        // Ethereal energy wing
        const wingLength = (1.1 + rand() * 0.4) * sizeMultiplier
        const wingWidth = (0.7 + rand() * 0.3) * sizeMultiplier

        const energyWing = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength, wingWidth, 1, 1),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            emissive: palette.accent,
            emissiveIntensity: 0.3,
          })
        )
        wingGroup.add(energyWing)
        break
      }
      default: {
        // Default wing
        const wing = new THREE.Mesh(
          new THREE.PlaneGeometry(
            (0.9 + rand() * 0.3) * sizeMultiplier,
            (0.6 + rand() * 0.2) * sizeMultiplier,
            2,
            2
          ),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        wingGroup.add(wing)
      }
    }

    wingGroup.position.set(side * 0.6 * sizeMultiplier, 0.3 * sizeMultiplier, -0.1 * sizeMultiplier)
    wingGroup.rotation.y = side * Math.PI * 0.1
    wingGroup.rotation.z = side * Math.PI * 0.15

    torso.add(wingGroup)
    wings.push(wingGroup)
  }
  return wings
}

function buildTails(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  torso: THREE.Object3D
): THREE.Object3D[] {
  const tails: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.tailCount; i++) {
    const segments = 5 + rangeInt(rand, 0, 4)
    const group = new THREE.Group()
    let parent: THREE.Object3D = group

    switch (anatomy.tailType) {
      case 'fur':
      case 'scale': {
        // Mammal/reptile tail - tapered segments
        for (let s = 0; s < segments; s++) {
          const thickness = 0.12 * sizeMultiplier * (1 - s / segments)
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(thickness, 0.25 * sizeMultiplier, 6, 8),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          seg.position.z = -0.22 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
        break
      }
      case 'feather': {
        // Bird tail - fan shape at end
        for (let s = 0; s < segments; s++) {
          const thickness = 0.1 * sizeMultiplier * (1 - s / segments)
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(thickness, 0.2 * sizeMultiplier, 6, 8),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          seg.position.z = -0.18 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
        // Add tail fan
        const fan = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4 * sizeMultiplier, 0.3 * sizeMultiplier),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          })
        )
        fan.position.z = -0.15 * sizeMultiplier
        parent.add(fan)
        break
      }
      default: {
        // Default segmented tail
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(
              0.12 * sizeMultiplier * (1 - s / segments),
              0.25 * sizeMultiplier,
              6,
              8
            ),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          seg.position.z = -0.22 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
      }
    }

    group.position.set(0, -0.2 * sizeMultiplier + rand() * 0.2, -0.6 * sizeMultiplier)
    torso.add(group)
    tails.push(group)
  }
  return tails
}

function buildAntennae(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head) return []
  const antennae: THREE.Object3D[] = []
  for (let i = 0; i < anatomy.antennaCount; i++) {
    const antenna = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.03, 0.35 + rand() * 0.4, 6, 10),
      new THREE.MeshStandardMaterial({ color: palette.accent })
    )
    antenna.position.set((i - (anatomy.antennaCount - 1) / 2) * 0.2, 0.4 + rand() * 0.2, 0.1)
    head.add(antenna)
    antennae.push(antenna)
  }
  return antennae
}

function buildEars(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head || anatomy.earCount === 0 || anatomy.earType === 'none') return []
  const ears: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.earCount; i++) {
    const side = i === 0 ? -1 : 1
    let ear: THREE.Mesh

    switch (anatomy.earType) {
      case 'pointed': {
        // Triangular pointed ears
        ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.15 * sizeMultiplier, 0.4 * sizeMultiplier, 4),
          new THREE.MeshStandardMaterial({ color: palette.base })
        )
        ear.rotation.z = side * Math.PI * 0.3
        break
      }
      case 'round': {
        // Round ears
        ear = new THREE.Mesh(
          new THREE.SphereGeometry(0.2 * sizeMultiplier, 12, 12),
          new THREE.MeshStandardMaterial({ color: palette.base })
        )
        ear.scale.set(0.6, 1.0, 0.3)
        break
      }
      case 'floppy': {
        // Floppy hanging ears
        ear = new THREE.Mesh(
          new THREE.PlaneGeometry(0.25 * sizeMultiplier, 0.5 * sizeMultiplier),
          new THREE.MeshStandardMaterial({ color: palette.base, side: THREE.DoubleSide })
        )
        ear.rotation.y = side * Math.PI * 0.5
        ear.rotation.z = side * Math.PI * 0.2
        break
      }
      case 'fin': {
        // Fish-like fin ears
        ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.2 * sizeMultiplier, 0.3 * sizeMultiplier, 3),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        ear.rotation.z = side * Math.PI * 0.5
        break
      }
      default:
        continue
    }

    ear.position.set(side * anatomy.headSize * 0.6, anatomy.headSize * 0.3, 0)
    head.add(ear)
    ears.push(ear)
  }
  return ears
}

function buildHorns(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head || anatomy.hornCount === 0 || anatomy.hornType === 'none') return []
  const horns: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.hornCount; i++) {
    let horn: THREE.Object3D

    switch (anatomy.hornType) {
      case 'straight': {
        // Straight pointed horn
        horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.08 * sizeMultiplier, 0.6 * sizeMultiplier, 8),
          new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.3, roughness: 0.4 })
        )
        horn.rotation.x = -Math.PI * 0.1
        break
      }
      case 'curved': {
        // Curved horn using multiple segments
        const hornGroup = new THREE.Group()
        const segments = 4
        let parent: THREE.Object3D = hornGroup
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(
            new THREE.ConeGeometry(
              0.08 * sizeMultiplier * (1 - s / segments),
              0.15 * sizeMultiplier,
              8
            ),
            new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.3 })
          )
          seg.position.y = 0.12 * sizeMultiplier
          seg.rotation.x = -0.3
          parent.add(seg)
          parent = seg
        }
        horn = hornGroup
        break
      }
      case 'spiral': {
        // Spiral horn
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.05, 0.15, 0.05),
          new THREE.Vector3(-0.05, 0.3, 0.05),
          new THREE.Vector3(0.05, 0.45, 0),
          new THREE.Vector3(0, 0.6, 0),
        ])
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.05 * sizeMultiplier, 8, false)
        horn = new THREE.Mesh(
          tubeGeometry,
          new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.4 })
        )
        break
      }
      case 'antler': {
        // Branching antler
        const antlerGroup = new THREE.Group()
        const main = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.04 * sizeMultiplier, 0.5 * sizeMultiplier, 6, 8),
          new THREE.MeshStandardMaterial({ color: palette.accent })
        )
        main.position.y = 0.25 * sizeMultiplier
        antlerGroup.add(main)

        // Add branches
        for (let b = 0; b < 2; b++) {
          const branch = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.03 * sizeMultiplier, 0.25 * sizeMultiplier, 6, 8),
            new THREE.MeshStandardMaterial({ color: palette.accent })
          )
          branch.position.set((b === 0 ? -0.1 : 0.1) * sizeMultiplier, 0.35 * sizeMultiplier, 0)
          branch.rotation.z = (b === 0 ? 1 : -1) * Math.PI * 0.3
          antlerGroup.add(branch)
        }
        horn = antlerGroup
        break
      }
      default:
        continue
    }

    // Position horns on head
    const angle = (i / Math.max(1, anatomy.hornCount - 1)) * Math.PI - Math.PI / 2
    horn.position.set(
      Math.sin(angle) * anatomy.headSize * 0.4,
      anatomy.headSize * 0.5,
      Math.cos(angle) * anatomy.headSize * 0.2
    )

    head.add(horn)
    horns.push(horn)
  }
  return horns
}

function buildSpines(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  torso: THREE.Object3D,
  tails: THREE.Object3D[]
): THREE.Object3D[] {
  if (anatomy.spineCount === 0 || anatomy.spineType === 'none') return []
  const spines: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.spineCount; i++) {
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.04 * sizeMultiplier, 0.2 * sizeMultiplier, 4),
      new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.2 })
    )

    switch (anatomy.spineType) {
      case 'back': {
        // Spines along the back
        const t = i / (anatomy.spineCount - 1)
        spine.position.set(0, 0.5 * sizeMultiplier, (t - 0.5) * 1.2 * sizeMultiplier)
        spine.rotation.x = Math.PI * 0.1
        torso.add(spine)
        break
      }
      case 'neck': {
        // Spines along neck area
        const t = i / (anatomy.spineCount - 1)
        spine.position.set(0, 0.3 * sizeMultiplier + t * 0.4, 0.5 * sizeMultiplier)
        spine.rotation.x = -Math.PI * 0.2
        torso.add(spine)
        break
      }
      case 'tail': {
        // Spines along tail
        if (tails.length > 0) {
          const tail = tails[0]
          const t = i / (anatomy.spineCount - 1)
          spine.position.set(0, 0.1 * sizeMultiplier, -t * 0.3 * sizeMultiplier)
          tail.add(spine)
        }
        break
      }
    }

    spines.push(spine)
  }
  return spines
}

function buildFurTufts(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  torso: THREE.Object3D
): THREE.Object3D[] {
  if (!anatomy.furTufts) return []
  const tufts: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // Add fur tufts at various locations
  const tuftLocations = [
    { x: 0, y: 0.4, z: 0.6 }, // chest
    { x: -0.3, y: 0.2, z: 0.3 }, // left side
    { x: 0.3, y: 0.2, z: 0.3 }, // right side
    { x: 0, y: 0.3, z: -0.5 }, // back
  ]

  for (const loc of tuftLocations) {
    const tuftGroup = new THREE.Group()

    // Create multiple small spheres for fluffy effect
    for (let i = 0; i < 3; i++) {
      const tuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 * sizeMultiplier, 8, 8),
        new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.9 })
      )
      tuft.position.set((rand() - 0.5) * 0.1, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.1)
      tuftGroup.add(tuft)
    }

    tuftGroup.position.set(loc.x * sizeMultiplier, loc.y * sizeMultiplier, loc.z * sizeMultiplier)
    torso.add(tuftGroup)
    tufts.push(tuftGroup)
  }

  return tufts
}

function buildScales(
  rand: Random,
  anatomy: Anatomy,
  palette: { base: THREE.Color; accent: THREE.Color },
  torso: THREE.Object3D
): THREE.Object3D[] {
  if (!anatomy.hasScales) return []
  const scales: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // Add scale pattern on body
  const scaleCount = 12 + Math.floor(rand() * 8)
  for (let i = 0; i < scaleCount; i++) {
    const scale = new THREE.Mesh(
      new THREE.CircleGeometry(0.08 * sizeMultiplier, 6),
      new THREE.MeshStandardMaterial({
        color: palette.accent,
        metalness: 0.4,
        roughness: 0.3,
        side: THREE.DoubleSide,
      })
    )

    // Random position on body surface
    const theta = rand() * Math.PI * 2
    const phi = rand() * Math.PI
    const radius = 0.5 * sizeMultiplier

    scale.position.set(
      Math.sin(phi) * Math.cos(theta) * radius,
      Math.cos(phi) * radius * 0.8,
      Math.sin(phi) * Math.sin(theta) * radius
    )

    // Orient scale to face outward
    scale.lookAt(scale.position.clone().multiplyScalar(2))

    torso.add(scale)
    scales.push(scale)
  }

  return scales
}

function makePalette(baseHue: number, rand: Random): { base: THREE.Color; accent: THREE.Color } {
  const base = new THREE.Color().setHSL(baseHue, 0.6, 0.55)
  const accent = new THREE.Color().setHSL((baseHue + 0.12 + (rand() - 0.5) * 0.1) % 1, 0.7, 0.6)
  return { base, accent }
}

export function spawnCreatureNearPath(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  rand: Random
): CreatureInstance {
  const anatomy = generateAnatomy(rand)
  return buildCreature(scene, anatomy, curve, rand)
}

export function spawnCreatureAt(
  scene: THREE.Scene,
  position: THREE.Vector3,
  rand: Random
): CreatureInstance {
  const anatomy = generateAnatomy(rand)
  // Create a simple curve for the buildCreature function (it won't be used for positioning)
  const dummyCurve = new THREE.CatmullRomCurve3([position, position])
  const creature = buildCreature(scene, anatomy, dummyCurve, rand)

  // Override position to exact location
  creature.group.position.copy(position)
  creature.anchor.copy(position)

  return creature
}

function buildCreature(
  scene: THREE.Scene,
  anatomy: Anatomy,
  curve: THREE.CatmullRomCurve3,
  rand: Random
): CreatureInstance {
  const palette = makePalette(anatomy.baseHue, rand)

  const group = new THREE.Group()
  const torso = buildTorso(rand, anatomy, palette)
  group.add(torso)

  const head = buildHead(rand, anatomy, palette)
  if (head) group.add(head)

  const eyes = buildEyes(rand, anatomy, head)
  const { mouth, lowerJaw } = buildMouth(rand, anatomy, head, palette)
  const limbs = buildLimbs(rand, anatomy, palette, torso)
  const wings = buildWings(rand, anatomy, palette, torso)
  const tails = buildTails(rand, anatomy, palette, torso)
  const antennae = buildAntennae(rand, anatomy, palette, head)

  // New decorative features
  const ears = buildEars(rand, anatomy, palette, head)
  const horns = buildHorns(rand, anatomy, palette, head)
  const spines = buildSpines(rand, anatomy, palette, torso, tails)
  const furTufts = buildFurTufts(rand, anatomy, palette, torso)
  const scales = buildScales(rand, anatomy, palette, torso)

  // Debug: Log creature features
  if (
    ears.length > 0 ||
    horns.length > 0 ||
    spines.length > 0 ||
    furTufts.length > 0 ||
    scales.length > 0 ||
    anatomy.pattern !== 'solid'
  ) {
    console.log(
      `Creature created with: ${ears.length} ears, ${horns.length} horns, ${spines.length} spines, ${furTufts.length} fur tufts, ${scales.length} scales, pattern: ${anatomy.pattern}`
    )
  }

  // Spawn near the track
  const t = rand()
  const pos = curve.getPointAt(t)
  const tangent = curve.getTangentAt(t)
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
  const offset = (rand() * 2 + 4) * (rand() > 0.5 ? 1 : -1)
  group.position
    .copy(pos)
    .addScaledVector(side, offset)
    .add(new THREE.Vector3(0, -0.2 + rand() * 1.6, 0))

  scene.add(group)

  // Animation parameters
  const floatAmplitude = 0.35 + rand() * 0.4
  const floatSpeed = 0.4 + rand() * 0.5
  const flapSpeed = 2.0 + rand() * 2.0
  const tailSpeed = 1.0 + rand() * 1.5
  const blinkInterval = 2.5 + rand() * 3.5
  let blinkTimer = blinkInterval * rand()

  // Enhanced behavior system
  const anchor = group.position.clone()
  const timeOffset = rand() * 1000
  let behaviorState: BehaviorState = 'idle'
  let behaviorTimer = 0
  let facingYaw = rand() * Math.PI * 2
  let targetYaw = facingYaw
  let poseTimer = 0

  // Territory setup for territorial creatures
  const territoryCenter = anatomy.temperament === 'territorial' ? anchor.clone() : undefined
  const territoryRadius = anatomy.temperament === 'territorial' ? 8 + rand() * 12 : undefined

  const setMouthOpen = (open: number) => {
    if (!lowerJaw) return
    const clamped = Math.max(0, Math.min(1, open))
    lowerJaw.rotation.x = -0.1 - clamped * 0.7
  }

  const getDistanceTo = (other: CreatureInstance): number => {
    return group.position.distanceTo(other.group.position)
  }

  const isInTerritory = (position: THREE.Vector3): boolean => {
    if (!territoryCenter || !territoryRadius) return false
    return territoryCenter.distanceTo(position) <= territoryRadius
  }

  // Create behavior context for the AI system
  const behaviorContext: BehaviorContext = {
    group,
    anchor,
    anatomy,
    rand,
    territoryCenter,
    territoryRadius,
    getDistanceTo,
  }

  // Internal behavior state
  const internalBehaviorState: BehaviorState_Internal = {
    state: behaviorState,
    timer: behaviorTimer,
    facingYaw,
    targetYaw,
    poseTimer,
    targetPosition: undefined,
    moveSpeed: 1.0,
  }

  const updateBehaviorState = (
    dt: number,
    camera?: THREE.Camera,
    allCreatures?: CreatureInstance[]
  ) => {
    // Update using the behavior module
    updateBehaviorStateLogic(behaviorContext, internalBehaviorState, dt, camera, allCreatures)

    // Apply smooth movement toward target
    updateMovement(anchor, internalBehaviorState, dt)

    // Sync back to local variables
    behaviorState = internalBehaviorState.state
    behaviorTimer = internalBehaviorState.timer
    facingYaw = internalBehaviorState.facingYaw
    targetYaw = internalBehaviorState.targetYaw
    poseTimer = internalBehaviorState.poseTimer
  }

  const update = (
    dt: number,
    tSec: number,
    camera?: THREE.Camera,
    allCreatures?: CreatureInstance[]
  ) => {
    updateBehaviorState(dt, camera, allCreatures)
    // Floating motion
    const upDown = Math.sin((tSec + timeOffset) * floatSpeed) * floatAmplitude
    group.position.set(anchor.x, anchor.y + upDown, anchor.z)

    // Gentle body breathing
    const s = 1.0 + Math.sin((tSec + timeOffset) * 1.6) * 0.03
    group.scale.setScalar(s)

    // Apply behavior-based animations
    setMouthOpen(getMouthOpenAmount(behaviorState))
    applyBehaviorEffects(behaviorState, group, tSec)

    // Turn body towards target yaw smoothly
    const yawDelta = ((targetYaw - facingYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    facingYaw += Math.max(-1.5 * dt, Math.min(1.5 * dt, yawDelta))
    group.rotation.y = facingYaw

    // Wings flapping
    for (let i = 0; i < wings.length; i++) {
      const wing = wings[i] as THREE.Mesh
      const dir = i % 2 === 0 ? 1 : -1
      const speedMultiplier = getWingFlapSpeedMultiplier(behaviorState)
      const speed = flapSpeed * speedMultiplier
      wing.rotation.z =
        dir * (Math.PI * 0.2 + Math.sin((tSec + timeOffset) * speed) * Math.PI * 0.12)
    }

    // Tails sway
    for (const tail of tails) {
      tail.rotation.y = Math.sin((tSec + timeOffset) * tailSpeed) * 0.6
      tail.rotation.x = Math.cos((tSec + timeOffset) * tailSpeed * 0.7) * 0.2
    }

    // Antennae wiggle
    for (const ant of antennae) {
      ant.rotation.z = Math.sin((tSec + timeOffset) * 2.2) * 0.3
    }

    // Ears twitch
    for (let i = 0; i < ears.length; i++) {
      const ear = ears[i]
      const side = i === 0 ? -1 : 1
      ear.rotation.z = side * Math.PI * 0.3 + Math.sin((tSec + timeOffset) * 3.0 + i) * 0.15
    }

    // Horns subtle movement (breathing)
    for (const horn of horns) {
      horn.rotation.y = Math.sin((tSec + timeOffset) * 0.5) * 0.05
    }

    // Spines subtle sway
    for (let i = 0; i < spines.length; i++) {
      const spine = spines[i]
      spine.rotation.x += Math.sin((tSec + timeOffset) * 1.5 + i * 0.5) * 0.02
    }

    // Fur tufts gentle wave
    for (const tuft of furTufts) {
      tuft.rotation.y = Math.sin((tSec + timeOffset) * 1.8) * 0.1
    }

    // Scales shimmer (subtle scale change)
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i]
      const shimmer = 1.0 + Math.sin((tSec + timeOffset) * 2.0 + i * 0.3) * 0.05
      scale.scale.setScalar(shimmer)
    }

    // Limbs idle sway
    for (let i = 0; i < limbs.length; i++) {
      const limb = limbs[i]
      limb.rotation.x = Math.sin((tSec + timeOffset) * 1.3 + i) * 0.3
      limb.rotation.y = Math.cos((tSec + timeOffset) * 1.1 + i * 0.5) * 0.2
    }

    // Eyes blink (scale pupils)
    blinkTimer -= dt
    if (blinkTimer <= 0) {
      blinkTimer = blinkInterval + rand() * 1.5
      for (const e of eyes) {
        // Access pupil from userData (more reliable than child index)
        const pupil = e.userData.pupil as THREE.Mesh
        if (pupil) {
          const targetScale = 0.1 + rand() * 0.5
          pupil.scale.set(1, targetScale, 1)
        }
      }
    }

    // Eye tracking - pupils follow camera when nearby
    if (camera) {
      const distanceToCamera = group.position.distanceTo(camera.position)
      const trackingDistance = 15 // Start tracking within 15 units

      if (distanceToCamera < trackingDistance) {
        for (const eye of eyes) {
          const pupil = eye.userData.pupil as THREE.Mesh
          const iris = eye.userData.iris as THREE.Mesh
          const maxOffset = eye.userData.maxOffset as number

          if (pupil && iris && maxOffset) {
            // Get world position of eye
            const eyeWorldPos = new THREE.Vector3()
            eye.getWorldPosition(eyeWorldPos)

            // Calculate direction to camera
            const directionToCamera = new THREE.Vector3()
              .subVectors(camera.position, eyeWorldPos)
              .normalize()

            // Convert to local space of the eye
            const eyeWorldQuaternion = new THREE.Quaternion()
            eye.getWorldQuaternion(eyeWorldQuaternion)
            const localDirection = directionToCamera
              .clone()
              .applyQuaternion(eyeWorldQuaternion.invert())

            // Calculate offset for pupil (constrained to maxOffset)
            const offsetX = Math.max(
              -maxOffset,
              Math.min(maxOffset, localDirection.x * maxOffset * 2)
            )
            const offsetY = Math.max(
              -maxOffset,
              Math.min(maxOffset, localDirection.y * maxOffset * 2)
            )

            // Smoothly move pupil and iris
            const smoothing = 0.1
            pupil.position.x += (offsetX - pupil.position.x) * smoothing
            pupil.position.y += (offsetY - pupil.position.y) * smoothing

            iris.position.x += (offsetX * 0.7 - iris.position.x) * smoothing
            iris.position.y += (offsetY * 0.7 - iris.position.y) * smoothing
          }
        }
      }
    }
  }

  const reactToPhoto = () => {
    poseTimer = 2.5 + rand() * 2.0
  }

  const creatureInstance: CreatureInstance = {
    group,
    anchor,
    timeOffset,
    rarity: anatomy.rarity,
    anatomy,
    behaviorState,
    behaviorTimer,
    territoryCenter,
    territoryRadius,
    update,
    reactToPhoto,
    getDistanceTo,
    isInTerritory,
  }

  return creatureInstance
}
