/**
 * Common utility functions to reduce code redundancy
 */

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
  configTarget: any,
  configKey: string,
  uniformTarget: { value: number },
  propertyName?: string
): void {
  const clampedValue = clamp(value, min, max, propertyName)
  configTarget[configKey] = clampedValue
  uniformTarget.value = clampedValue
}

/**
 * Mathematical constant for 2π (tau)
 */
export const TAU = Math.PI * 2

/**
 * Generate a random value centered around 0 (-0.5 to 0.5)
 */
export function randomCentered(): number {
  return Math.random() - 0.5
}

/**
 * Generate a random value centered around 0 using a seeded random function
 */
export function randomCenteredSeeded(rand: () => number): number {
  return rand() - 0.5
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
 * Map a value from one range to another
 */
export function mapRange(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin)
}
