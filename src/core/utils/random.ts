/**
 * Generate a random value centered around 0 using Math.random()
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
