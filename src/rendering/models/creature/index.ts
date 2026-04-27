// Creature model building modules
// Each body part is a separate module for easy composition and extension

// Core utilities
export type { CreaturePalette } from './palette'
export {
  makePalette,
  getArchetypeMaterial,
  createCreatureMaterial,
} from './palette'

export type { BodyScale } from './body-types'
export {
  getBodyTypeScale,
  getSizeMultiplier,
  getHeadSizeMultiplier,
  getNeckHeight,
  getLimbThicknessMultiplier,
} from './body-types'

// Body part builders
export { buildTorso } from './torso'

export type { MouthParts } from './head'
export { buildHead, buildEyes, buildMouth } from './head'

export { buildLimbs } from './limbs'

export { buildWings } from './wings'

export { buildTails, buildSpines } from './tails'

export {
  buildAntennae,
  buildEars,
  buildHorns,
  buildFurTufts,
  buildScales,
} from './decorations'
