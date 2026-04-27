import { TAU } from '@core/constants'

/**
 * Clamp a value between min and max, with optional logging
 */
export function clamp(value: number, min: number, max: number, propertyName?: string): number {
  const clampedValue = Math.max(min, Math.min(max, value))

  if (clampedValue !== value && propertyName) {
    console.warn(`${propertyName} clamped from ${value} to ${clampedValue}`)
  }

  return clampedValue
}

/**
 * Clamp a value and update both config and uniform
 */
export function clampAndUpdate(
  value: number,
  min: number,
  max: number,
  configTarget: Record<string, number>,
  configKey: string,
  uniformTarget: { value: number },
  propertyName?: string
): void {
  const clampedValue = clamp(value, min, max, propertyName)
  configTarget[configKey] = clampedValue
  uniformTarget.value = clampedValue
}

/**
 * Normalize an angle to [0, 2π)
 */
export function normalizeAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Simple memoization utility for expensive function calls
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyGenerator?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>()

  return (...args: TArgs): TReturn => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * Memoized trigonometric functions for better performance
 */
export const memoizedSin = memoize(Math.sin, (x: number) => x.toFixed(3))
export const memoizedCos = memoize(Math.cos, (x: number) => x.toFixed(3))
export const memoizedTan = memoize(Math.tan, (x: number) => x.toFixed(3))

/**
 * Memoized square root for performance-critical calculations
 */
export const memoizedSqrt = memoize(Math.sqrt, (x: number) => x.toFixed(3))

/**
 * Fast approximation functions for performance-critical code
 */
export function fastSin(x: number): number {
  // Using Taylor series approximation for better performance than Math.sin
  const x2 = x * x
  return x - (x2 * x) / 6 + (x2 * x2 * x) / 120 - (x2 * x2 * x2 * x) / 5040
}

export function fastCos(x: number): number {
  // Using Taylor series approximation
  const x2 = x * x
  return 1 - x2 / 2 + (x2 * x2) / 24 - (x2 * x2 * x2) / 720
}
