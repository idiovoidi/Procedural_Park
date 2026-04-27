import type { Anatomy, BodyType } from '@systems/creatures/types'

export interface BodyScale {
  width: number
  height: number
  length: number
}

export function getBodyTypeScale(bodyType: BodyType): BodyScale {
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

export function getSizeMultiplier(size: Anatomy['size']): number {
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

export function getHeadSizeMultiplier(bodyType: BodyType): number {
  switch (bodyType) {
    case 'chubby':
      return 0.9
    case 'bulky':
      return 0.85
    case 'compact':
      return 1.1
    case 'lanky':
      return 0.8
    default:
      return 1.0
  }
}

export function getNeckHeight(bodyType: BodyType): number {
  switch (bodyType) {
    case 'lanky':
      return 0.7
    case 'chubby':
      return 0.3
    case 'bulky':
      return 0.4
    case 'sleek':
      return 0.6
    default:
      return 0.5
  }
}

export function getLimbThicknessMultiplier(bodyType: BodyType): number {
  switch (bodyType) {
    case 'muscular':
      return 1.3
    case 'bulky':
      return 1.4
    case 'chubby':
      return 1.2
    case 'lanky':
      return 0.7
    case 'sleek':
      return 0.8
    default:
      return 1.0
  }
}
