// Barrel export for utils module
export {
  clamp,
  clampAndUpdate,
  normalizeAngle,
  lerp,
  memoize,
  memoizedSin,
  memoizedCos,
  memoizedTan,
  memoizedSqrt,
  fastSin,
  fastCos,
} from './math'

export {
  ObjectPool,
  vector3Pool,
  vector2Pool,
  colorPool,
  getPooledVector3,
  getPooledVector2,
  getPooledColor,
  releaseVector3,
  releaseVector2,
} from './pooling'

export { randomCentered, randomCenteredSeeded } from './random'
