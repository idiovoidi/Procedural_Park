// Barrel export for utils module
export {
  clamp,
  clampAndUpdate,
  fastCos,
  fastSin,
  lerp,
  memoize,
  memoizedCos,
  memoizedSin,
  memoizedSqrt,
  memoizedTan,
  normalizeAngle,
} from './math'

export {
  colorPool,
  getPooledColor,
  getPooledVector2,
  getPooledVector3,
  ObjectPool,
  releaseVector2,
  releaseVector3,
  vector2Pool,
  vector3Pool,
} from './pooling'

export { randomCentered, randomCenteredSeeded } from './random'
