// Creature model building modules
// Each body part is a separate module for easy composition and extension

export type { BodyScale } from './body-types'
export {
  getBodyTypeScale,
  getHeadSizeMultiplier,
  getLimbThicknessMultiplier,
  getNeckHeight,
  getSizeMultiplier,
} from './body-types'
export {
  buildAntennae,
  buildEars,
  buildFurTufts,
  buildHorns,
  buildScales,
} from './decorations'
export type { MouthParts } from './head'
export { buildEyes, buildHead, buildMouth } from './head'
export { buildLimbs } from './limbs'
// Core utilities
export type { CreaturePalette } from './palette'
export {
  createCreatureMaterial,
  getArchetypeMaterial,
  makePalette,
} from './palette'
// Body part builders
export type { BodyBounds } from './sockets'
export { buildSpines, buildTails } from './tails'
export type { BodyShell } from './torso'
export { buildTorso } from './torso'
export { buildWings } from './wings'
