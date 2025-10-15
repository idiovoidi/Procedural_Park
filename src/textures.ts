import * as THREE from 'three'

export type PatternType =
  | 'solid'
  | 'spots'
  | 'stripes'
  | 'gradient'
  | 'patches'
  | 'tiger'
  | 'leopard'

export function createPatternTexture(
  pattern: PatternType,
  baseColor: THREE.Color,
  patternColor: THREE.Color,
  seed: number
): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  // Simple seeded random
  let randSeed = seed
  const rand = () => {
    randSeed = (randSeed * 9301 + 49297) % 233280
    return randSeed / 233280
  }

  // Fill base color
  ctx.fillStyle = `rgb(${baseColor.r * 255}, ${baseColor.g * 255}, ${baseColor.b * 255})`
  ctx.fillRect(0, 0, 512, 512)

  const patternRGB = `rgb(${patternColor.r * 255}, ${patternColor.g * 255}, ${patternColor.b * 255})`

  switch (pattern) {
    case 'spots': {
      // Random circular spots
      ctx.fillStyle = patternRGB
      const spotCount = 20 + Math.floor(rand() * 30)
      for (let i = 0; i < spotCount; i++) {
        const x = rand() * 512
        const y = rand() * 512
        const radius = 10 + rand() * 30
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'stripes': {
      // Horizontal stripes
      ctx.fillStyle = patternRGB
      const stripeCount = 8 + Math.floor(rand() * 6)
      const stripeHeight = 512 / stripeCount
      for (let i = 0; i < stripeCount; i += 2) {
        ctx.fillRect(0, i * stripeHeight, 512, stripeHeight * 0.8)
      }
      break
    }

    case 'tiger': {
      // Irregular tiger-like stripes
      ctx.fillStyle = patternRGB
      const stripeCount = 12 + Math.floor(rand() * 8)
      for (let i = 0; i < stripeCount; i++) {
        const y = (i / stripeCount) * 512
        const height = 15 + rand() * 20
        const offset = (rand() - 0.5) * 100

        ctx.beginPath()
        ctx.moveTo(0, y)
        // Create wavy stripe
        for (let x = 0; x <= 512; x += 32) {
          const wave = Math.sin(x * 0.02 + rand() * 10) * 10
          ctx.lineTo(x + offset, y + wave)
        }
        ctx.lineTo(512, y + height)
        for (let x = 512; x >= 0; x -= 32) {
          const wave = Math.sin(x * 0.02 + rand() * 10) * 10
          ctx.lineTo(x + offset, y + height + wave)
        }
        ctx.closePath()
        ctx.fill()
      }
      break
    }

    case 'leopard': {
      // Rosette spots (leopard pattern)
      ctx.strokeStyle = patternRGB
      ctx.fillStyle = patternRGB
      ctx.lineWidth = 3
      const rosetteCount = 15 + Math.floor(rand() * 15)

      for (let i = 0; i < rosetteCount; i++) {
        const x = rand() * 512
        const y = rand() * 512
        const radius = 15 + rand() * 20

        // Draw ring
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.stroke()

        // Add center spots
        for (let j = 0; j < 3; j++) {
          const angle = rand() * Math.PI * 2
          const dist = rand() * radius * 0.5
          ctx.beginPath()
          ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }

    case 'patches': {
      // Large irregular patches
      ctx.fillStyle = patternRGB
      const patchCount = 5 + Math.floor(rand() * 5)

      for (let i = 0; i < patchCount; i++) {
        const x = rand() * 512
        const y = rand() * 512
        const size = 50 + rand() * 100

        ctx.beginPath()
        ctx.moveTo(x, y)

        // Create irregular blob
        const points = 6 + Math.floor(rand() * 4)
        for (let j = 0; j < points; j++) {
          const angle = (j / points) * Math.PI * 2
          const dist = size * (0.7 + rand() * 0.6)
          ctx.lineTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist)
        }
        ctx.closePath()
        ctx.fill()
      }
      break
    }

    case 'gradient': {
      // Vertical gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 512)
      gradient.addColorStop(
        0,
        `rgb(${baseColor.r * 255}, ${baseColor.g * 255}, ${baseColor.b * 255})`
      )
      gradient.addColorStop(0.5, patternRGB)
      gradient.addColorStop(
        1,
        `rgb(${baseColor.r * 255}, ${baseColor.g * 255}, ${baseColor.b * 255})`
      )
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 512, 512)
      break
    }

    case 'solid':
    default:
      // Already filled with base color
      break
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true

  return texture
}

export function createBellyTexture(bellyColor: THREE.Color, baseColor: THREE.Color): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  // Create gradient from belly to base color
  const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256)
  gradient.addColorStop(
    0,
    `rgb(${bellyColor.r * 255}, ${bellyColor.g * 255}, ${bellyColor.b * 255})`
  )
  gradient.addColorStop(
    0.6,
    `rgb(${bellyColor.r * 255}, ${bellyColor.g * 255}, ${bellyColor.b * 255})`
  )
  gradient.addColorStop(1, `rgb(${baseColor.r * 255}, ${baseColor.g * 255}, ${baseColor.b * 255})`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true

  return texture
}
