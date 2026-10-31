import { TAU } from '@core/constants'
import * as THREE from 'three'
import {
  hash3,
  jitter,
  limb,
  mergeParts,
  noise3,
  paint,
  prepare,
  type Rand,
  restOnGround,
} from './prop-geometry'
import { smoothstep } from './terrain-height'

/**
 * Prop geometry builders. Each returns one merged, flat-shaded, vertex-coloured
 * geometry whose lowest point sits at y = 0 (or slightly below, for trunks that need to
 * bury their base), ready to be instanced.
 */

const hsl = (out: THREE.Color, h: number, s: number, l: number) =>
  out.setHSL(h, s, l, THREE.SRGBColorSpace)

export type TreeKind = 'pine' | 'oak' | 'birch' | 'blossom' | 'dead'
export type RockKind = 'stone' | 'mossy' | 'crystal'
export type RockShape = 'boulder' | 'slab' | 'spire' | 'cluster'

function paintBark(
  geometry: THREE.BufferGeometry,
  hue: number,
  sat: number,
  light: number
): THREE.BufferGeometry {
  return paint(geometry, (f, out) => hsl(out, hue, sat, light * (0.82 + f.noise * 0.36)))
}

// ---------------------------------------------------------------- trees

export function buildPine(rand: Rand): THREE.BufferGeometry {
  const height = 5.5 + rand() * 3.5
  const scale = height / 7
  const trunkHeight = height * 0.3
  const parts: THREE.BufferGeometry[] = []

  const trunk = prepare(new THREE.CylinderGeometry(0.1, 0.3, trunkHeight + 0.5, 6))
  trunk.translate(0, (trunkHeight + 0.5) / 2 - 0.25, 0)
  jitter(trunk, 0.02)
  parts.push(paintBark(trunk, 0.07, 0.3, 0.2))

  const tiers = 4 + Math.floor(rand() * 2)
  const hue = 0.34 + rand() * 0.05
  const light = 0.17 + rand() * 0.05
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1)
    const radius = (2.0 - 1.4 * t) * (0.9 + rand() * 0.2) * scale
    const coneHeight = (2.4 - 0.7 * t) * scale
    const base = trunkHeight * 0.55 + t * (height - trunkHeight * 0.55 - coneHeight)

    const cone = prepare(new THREE.ConeGeometry(radius, coneHeight, 7))
    cone.rotateY(rand() * TAU)
    cone.rotateX((rand() - 0.5) * 0.12)
    cone.rotateZ((rand() - 0.5) * 0.12)
    cone.translate(0, base + coneHeight / 2, 0)
    jitter(cone, radius * 0.07, i * 13)
    parts.push(
      paint(cone, (f, out) => {
        const k = (f.y - base) / coneHeight
        hsl(out, hue + (f.noise - 0.5) * 0.03, 0.5, light + k * 0.09 + (f.noise - 0.5) * 0.04)
        if (f.ny < -0.3) out.multiplyScalar(0.7)
      })
    )
  }
  return mergeParts(parts)
}

interface CanopyStyle {
  hue: number
  sat: number
  light: number
  bark: [number, number, number]
}

const CANOPY_STYLES: Record<'oak' | 'birch' | 'blossom', CanopyStyle> = {
  oak: { hue: 0.27, sat: 0.5, light: 0.27, bark: [0.07, 0.3, 0.2] },
  birch: { hue: 0.2, sat: 0.55, light: 0.42, bark: [0.12, 0.08, 0.78] },
  blossom: { hue: 0.94, sat: 0.55, light: 0.68, bark: [0.05, 0.25, 0.17] },
}

export function buildBroadleaf(
  rand: Rand,
  kind: 'oak' | 'birch' | 'blossom'
): THREE.BufferGeometry {
  const style = CANOPY_STYLES[kind]
  const birch = kind === 'birch'
  const trunkHeight = birch ? 3 + rand() * 1.5 : 1.6 + rand() * 1.2
  const trunkRadius = birch ? 0.11 : 0.2
  const parts: THREE.BufferGeometry[] = []

  const trunk = limb(
    trunkRadius * 0.7,
    trunkRadius * 1.5,
    trunkHeight + 0.4,
    7,
    (rand() - 0.5) * 0.1,
    (rand() - 0.5) * 0.1
  )
  trunk.translate(0, -0.2, 0)
  jitter(trunk, 0.015)
  if (birch) {
    parts.push(
      paint(trunk, (f, out) => {
        hsl(out, style.bark[0], style.bark[1], style.bark[2] * (0.9 + f.noise * 0.15))
        // Dark papery bands
        if (f.noise > 0.78) out.multiplyScalar(0.3)
      })
    )
  } else {
    parts.push(paintBark(trunk, style.bark[0], style.bark[1], style.bark[2]))
  }

  const branches = birch ? 2 : 3
  for (let i = 0; i < branches; i++) {
    const length = 0.9 + rand() * 0.6
    const branch = limb(0.03, 0.08, length, 5, 0.5 + rand() * 0.5, 0)
    branch.rotateY(rand() * TAU)
    branch.translate(0, trunkHeight * (0.55 + rand() * 0.35), 0)
    parts.push(paintBark(branch, style.bark[0], style.bark[1], style.bark[2]))
  }

  const canopyRadius = birch ? 1.1 + rand() * 0.4 : 1.7 + rand() * 0.8
  const centerY = trunkHeight + canopyRadius * 0.55
  const blobs = birch ? 4 : 5 + Math.floor(rand() * 3)
  for (let j = 0; j < blobs; j++) {
    const angle = (j / blobs) * TAU + rand()
    const distance = j === 0 ? 0 : canopyRadius * (0.45 + rand() * 0.35)
    const y = centerY + (j === 0 ? canopyRadius * 0.35 : (rand() - 0.3) * canopyRadius * 0.5)
    const radius = canopyRadius * (j === 0 ? 0.8 : 0.5 + rand() * 0.25)

    const blob = prepare(new THREE.IcosahedronGeometry(radius, 1))
    jitter(blob, radius * 0.16, j * 7)
    blob.scale(1, 0.82, 1)
    blob.translate(Math.cos(angle) * distance, y, Math.sin(angle) * distance)

    const hueShift = (rand() - 0.5) * 0.03
    const lightShift = (rand() - 0.5) * 0.06
    parts.push(
      paint(blob, (f, out) =>
        hsl(
          out,
          style.hue + hueShift + (f.noise - 0.5) * 0.02,
          style.sat,
          style.light + lightShift + f.ny * 0.07 + (f.noise - 0.5) * 0.04
        )
      )
    )
  }
  return mergeParts(parts)
}

export function buildDeadTree(rand: Rand): THREE.BufferGeometry {
  const height = 3 + rand() * 2.2
  const parts: THREE.BufferGeometry[] = []
  const color: [number, number, number] = [0.08, 0.12, 0.33]

  const trunk = limb(0.06, 0.28, height, 6, (rand() - 0.5) * 0.15, (rand() - 0.5) * 0.15)
  trunk.translate(0, -0.15, 0)
  jitter(trunk, 0.02)
  parts.push(paintBark(trunk, ...color))

  const branches = 4 + Math.floor(rand() * 3)
  for (let i = 0; i < branches; i++) {
    const y = height * (0.35 + rand() * 0.6)
    const length = (height - y) * 0.5 + 0.5
    const branch = limb(0.015, 0.07, length, 5, 0.7 + rand() * 0.6, 0)
    branch.rotateY(rand() * TAU)
    branch.translate(0, y, 0)
    parts.push(paintBark(branch, ...color))
  }
  return mergeParts(parts)
}

export function buildTree(rand: Rand, kind: TreeKind): THREE.BufferGeometry {
  if (kind === 'pine') return buildPine(rand)
  if (kind === 'dead') return buildDeadTree(rand)
  return buildBroadleaf(rand, kind)
}

// ---------------------------------------------------------------- rocks

const MOSS = new THREE.Color().setHSL(0.25, 0.4, 0.3, THREE.SRGBColorSpace)

/** Paint rock-like geometry: grey faces, darker toward the base, optional moss on top. */
export function paintRock(
  geometry: THREE.BufferGeometry,
  kind: RockKind,
  minY: number,
  maxY: number
): THREE.BufferGeometry {
  const span = Math.max(0.001, maxY - minY)
  return paint(geometry, (f, out) => {
    const k = (f.y - minY) / span
    if (kind === 'crystal') {
      hsl(out, 0.72 + (f.noise - 0.5) * 0.03, 0.25, 0.18 + k * 0.1 + f.ny * 0.04)
    } else {
      hsl(out, 0.08 + (f.noise - 0.5) * 0.02, 0.08, 0.34 + k * 0.1 + f.ny * 0.05)
      if (kind === 'mossy') {
        const moss = smoothstep(0.4, 0.8, f.ny) * (f.noise > 0.2 ? 1 : 0.4)
        out.lerp(MOSS, moss * 0.85)
      }
    }
    out.multiplyScalar(0.92 + f.noise * 0.16)
  })
}

function rockBody(
  rand: Rand,
  kind: RockKind,
  sx: number,
  sy: number,
  sz: number,
  detail = 1
): THREE.BufferGeometry {
  const geo = prepare(new THREE.IcosahedronGeometry(1, detail))
  const seed = rand() * 100
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const wobble =
      noise3(x * 1.6 + seed, y * 1.6 + seed, z * 1.6 + seed) * 0.28 +
      (hash3(Math.round(x * 500), Math.round(y * 500), Math.round(z * 500)) - 0.5) * 0.16
    const r = 1 + wobble
    // Flat base so the rock sits on the ground instead of balancing on a point
    pos.setXYZ(i, x * r * sx, Math.max(y * r * sy, -0.3 * sy), z * r * sz)
  }
  restOnGround(geo)
  const maxY = geo.boundingBox ? geo.boundingBox.max.y : sy
  return paintRock(geo, kind, 0, maxY)
}

export function buildRock(rand: Rand, kind: RockKind, shape: RockShape): THREE.BufferGeometry {
  switch (shape) {
    case 'slab':
      return rockBody(rand, kind, 1.2 + rand() * 0.5, 0.4 + rand() * 0.2, 0.9 + rand() * 0.4)
    case 'spire':
      return rockBody(rand, kind, 0.5 + rand() * 0.2, 1.3 + rand() * 0.6, 0.5 + rand() * 0.2)
    case 'cluster': {
      const parts = [
        rockBody(rand, kind, 0.9 + rand() * 0.3, 0.7 + rand() * 0.3, 0.9 + rand() * 0.3),
      ]
      const extras = 2 + Math.floor(rand() * 2)
      for (let i = 0; i < extras; i++) {
        const size = 0.3 + rand() * 0.25
        const part = rockBody(rand, kind, size * 1.2, size, size)
        const angle = (i / extras) * TAU + rand()
        const distance = 0.9 + rand() * 0.35
        part.rotateY(rand() * TAU)
        part.translate(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
        parts.push(part)
      }
      return mergeParts(parts)
    }
    default:
      return rockBody(rand, kind, 0.9 + rand() * 0.5, 0.65 + rand() * 0.35, 0.9 + rand() * 0.5)
  }
}

export function buildCrystalCluster(rand: Rand, hue: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const count = 4 + Math.floor(rand() * 4)
  for (let i = 0; i < count; i++) {
    const main = i === 0
    const radius = 0.14 + rand() * 0.16
    const height = (0.9 + rand() * 1.8) * (main ? 1.4 : 1)
    const tipHeight = radius * 2.6
    const tiltX = main ? (rand() - 0.5) * 0.15 : (rand() - 0.5) * 1.0
    const tiltZ = main ? (rand() - 0.5) * 0.15 : (rand() - 0.5) * 1.0
    const offsetAngle = rand() * TAU
    const offset = main ? 0 : 0.15 + rand() * 0.35
    const shade = (rand() - 0.5) * 0.05

    const body = prepare(new THREE.CylinderGeometry(radius * 0.85, radius, height, 6))
    body.translate(0, height / 2, 0)
    const tip = prepare(new THREE.ConeGeometry(radius * 0.85, tipHeight, 6))
    tip.translate(0, height + tipHeight / 2, 0)

    for (const [part, isTip] of [
      [body, false],
      [tip, true],
    ] as const) {
      part.rotateX(tiltX)
      part.rotateZ(tiltZ)
      part.translate(Math.cos(offsetAngle) * offset, -0.05, Math.sin(offsetAngle) * offset)
      parts.push(
        paint(part, (f, out) =>
          hsl(out, hue + (f.noise - 0.5) * 0.04, 0.65, (isTip ? 0.62 : 0.45) + shade + f.ny * 0.05)
        )
      )
    }
  }
  return mergeParts(parts)
}

// ---------------------------------------------------------------- ground cover

type Palette = [number, number, number]

/** A tuft of flat blades, each a lower quad plus a tapering tip, leaning in random directions. */
function bladeClump(
  rand: Rand,
  count: number,
  minHeight: number,
  maxHeight: number,
  width: number,
  lean: number,
  spread: number,
  palette: { base: Palette; mid: Palette; tip: Palette }
): THREE.BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []
  const color = new THREE.Color()
  const push = (x: number, y: number, z: number, tone: Palette, shade: number) => {
    positions.push(x, y, z)
    hsl(color, tone[0], tone[1], tone[2] + shade)
    colors.push(color.r, color.g, color.b)
  }

  for (let b = 0; b < count; b++) {
    const angle = rand() * TAU
    const distance = Math.sqrt(rand()) * spread
    const bx = Math.cos(angle) * distance
    const bz = Math.sin(angle) * distance
    const height = minHeight + rand() * (maxHeight - minHeight)
    const face = rand() * TAU
    const halfWidth = (width * (0.8 + rand() * 0.4)) / 2
    const dx = Math.cos(face) * halfWidth
    const dz = Math.sin(face) * halfWidth
    const leanAngle = rand() * TAU
    const lx = Math.cos(leanAngle) * lean * height
    const lz = Math.sin(leanAngle) * lean * height
    const shade = (rand() - 0.5) * 0.06
    const midY = height * 0.55
    const mx = bx + lx * 0.35
    const mz = bz + lz * 0.35

    const lowL: [number, number, number] = [bx - dx, 0, bz - dz]
    const lowR: [number, number, number] = [bx + dx, 0, bz + dz]
    const midL: [number, number, number] = [mx - dx * 0.7, midY, mz - dz * 0.7]
    const midR: [number, number, number] = [mx + dx * 0.7, midY, mz + dz * 0.7]
    const top: [number, number, number] = [bx + lx, height, bz + lz]

    // Each triangle is emitted with both windings so the blades can be one-sided yet
    // visible from every angle, all sharing the same upward-facing lighting
    const tri = (
      a: [number, number, number],
      ta: Palette,
      b: [number, number, number],
      tb: Palette,
      c: [number, number, number],
      tc: Palette
    ) => {
      push(...a, ta, shade)
      push(...b, tb, shade)
      push(...c, tc, shade)
      push(...a, ta, shade)
      push(...c, tc, shade)
      push(...b, tb, shade)
    }
    tri(lowL, palette.base, lowR, palette.base, midL, palette.mid)
    tri(lowR, palette.base, midR, palette.mid, midL, palette.mid)
    tri(midL, palette.mid, midR, palette.mid, top, palette.tip)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  // Blades are lit as if facing the sky; their real normals are edge-on to the sun and render near-black
  const up = new Float32Array(positions.length)
  for (let i = 1; i < up.length; i += 3) up[i] = 1
  geo.setAttribute('normal', new THREE.BufferAttribute(up, 3))
  geo.computeBoundingSphere()
  return geo
}

const GRASS_PALETTE = {
  base: [0.3, 0.55, 0.24] as Palette,
  mid: [0.27, 0.55, 0.36] as Palette,
  tip: [0.2, 0.6, 0.55] as Palette,
}

const REED_PALETTE = {
  base: [0.25, 0.4, 0.2] as Palette,
  mid: [0.2, 0.45, 0.34] as Palette,
  tip: [0.13, 0.5, 0.48] as Palette,
}

export function buildGrassClump(rand: Rand): THREE.BufferGeometry {
  return bladeClump(rand, 8 + Math.floor(rand() * 4), 0.35, 0.9, 0.09, 0.3, 0.22, GRASS_PALETTE)
}

export function buildReeds(rand: Rand): THREE.BufferGeometry {
  return bladeClump(rand, 7, 1.1, 2.2, 0.07, 0.12, 0.28, REED_PALETTE)
}

export function buildCattails(rand: Rand): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 4; i++) {
    const height = 1.3 + rand() * 0.9
    const stem = prepare(new THREE.CylinderGeometry(0.012, 0.02, height, 4))
    stem.translate(0, height / 2, 0)
    const head = prepare(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 6))
    head.translate(0, height + 0.05, 0)

    const tiltX = (rand() - 0.5) * 0.25
    const tiltZ = (rand() - 0.5) * 0.25
    const angle = rand() * TAU
    const offset = rand() * 0.25
    for (const [part, isHead] of [
      [stem, false],
      [head, true],
    ] as const) {
      part.rotateX(tiltX)
      part.rotateZ(tiltZ)
      part.translate(Math.cos(angle) * offset, 0, Math.sin(angle) * offset)
      parts.push(
        paint(part, (f, out) =>
          isHead
            ? hsl(out, 0.07, 0.5, 0.2 + f.noise * 0.05)
            : hsl(out, 0.24, 0.4, 0.28 + f.noise * 0.05)
        )
      )
    }
  }
  return mergeParts(parts)
}

export function buildFlowerPatch(rand: Rand, headHex: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const head = new THREE.Color(headHex)
  const stems = 3 + Math.floor(rand() * 2)
  for (let i = 0; i < stems; i++) {
    const height = 0.35 + rand() * 0.35
    const stem = prepare(new THREE.CylinderGeometry(0.012, 0.016, height, 3))
    stem.translate(0, height / 2, 0)
    const bloom = prepare(new THREE.IcosahedronGeometry(0.075, 0))
    bloom.scale(1, 0.55, 1)
    bloom.translate(0, height + 0.01, 0)

    const tiltX = (rand() - 0.5) * 0.3
    const tiltZ = (rand() - 0.5) * 0.3
    const angle = rand() * TAU
    const offset = rand() * 0.28
    for (const [part, isBloom] of [
      [stem, false],
      [bloom, true],
    ] as const) {
      part.rotateX(tiltX)
      part.rotateZ(tiltZ)
      part.translate(Math.cos(angle) * offset, 0, Math.sin(angle) * offset)
      parts.push(
        paint(part, (f, out) => {
          if (isBloom) out.copy(head).multiplyScalar(0.9 + f.noise * 0.2)
          else hsl(out, 0.3, 0.5, 0.3)
        })
      )
    }
  }
  return mergeParts(parts)
}

export function buildMushroomCluster(rand: Rand, capHex: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const cap = new THREE.Color(capHex)
  const spots = new THREE.Color(0xf2e8cf)
  const count = 2 + Math.floor(rand() * 3)
  for (let i = 0; i < count; i++) {
    const size = 0.7 + rand() * 0.7
    const stemHeight = 0.14 * size
    const stem = prepare(new THREE.CylinderGeometry(0.035 * size, 0.05 * size, stemHeight, 5))
    stem.translate(0, stemHeight / 2, 0)
    const hat = prepare(new THREE.SphereGeometry(0.11 * size, 7, 3, 0, TAU, 0, Math.PI / 2))
    hat.scale(1, 0.7, 1)
    hat.translate(0, stemHeight - 0.01, 0)

    const angle = rand() * TAU
    const offset = i === 0 ? 0 : 0.1 + rand() * 0.15
    for (const [part, isHat] of [
      [stem, false],
      [hat, true],
    ] as const) {
      part.translate(Math.cos(angle) * offset, 0, Math.sin(angle) * offset)
      parts.push(
        paint(part, (f, out) => {
          if (!isHat) return hsl(out, 0.12, 0.2, 0.78)
          out.copy(cap)
          if (f.ny > 0.3 && f.noise > 0.8) out.copy(spots)
          return out
        })
      )
    }
  }
  return mergeParts(parts)
}

export function buildLilyPad(rand: Rand, withFlower: boolean): THREE.BufferGeometry {
  const radius = 0.4 + rand() * 0.3
  const pad = prepare(new THREE.CircleGeometry(radius, 9, rand() * TAU, TAU - 0.6))
  pad.rotateX(-Math.PI / 2)
  const parts = [
    paint(pad, (f, out) => hsl(out, 0.3 + (f.noise - 0.5) * 0.03, 0.5, 0.22 + f.noise * 0.06)),
  ]
  if (withFlower) {
    const bloom = prepare(new THREE.ConeGeometry(0.09, 0.14, 6))
    bloom.translate(0, 0.07, 0)
    parts.push(paint(bloom, (f, out) => hsl(out, 0.93, 0.6, 0.75 + f.noise * 0.08)))
  }
  return mergeParts(parts)
}

// ---------------------------------------------------------------- landmarks

export function buildStoneArch(rand: Rand): THREE.BufferGeometry {
  const halfSpan = 2.6 + rand() * 0.6
  const springY = 3.6 + rand() * 0.6
  const kind: RockKind = rand() > 0.5 ? 'mossy' : 'stone'
  const parts: THREE.BufferGeometry[] = []

  const block = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    rotZ: number,
    yaw: number
  ) => {
    const box = prepare(new THREE.BoxGeometry(w, h, d, 2, 2, 2))
    box.rotateZ(rotZ)
    box.rotateY(yaw)
    box.translate(x, y, 0)
    jitter(box, 0.1, Math.floor(x * 10 + y * 7))
    parts.push(box)
  }

  // Two stacked-course pillars
  const courses = Math.round(springY / 1.4)
  for (const side of [-1, 1]) {
    for (let i = 0; i < courses; i++) {
      block(
        1.5 + rand() * 0.3,
        1.5,
        1.4 + rand() * 0.3,
        side * (halfSpan + (rand() - 0.5) * 0.25),
        0.7 + i * 1.4,
        (rand() - 0.5) * 0.08,
        (rand() - 0.5) * 0.2
      )
    }
  }

  // Voussoirs following a flattened semicircle between the pillars
  const stones = 7
  for (let k = 0; k < stones; k++) {
    const a = (Math.PI * (k + 0.5)) / stones
    block(
      1.35,
      1.25,
      1.4 + rand() * 0.2,
      Math.cos(a) * halfSpan,
      springY + Math.sin(a) * halfSpan * 0.55,
      a,
      (rand() - 0.5) * 0.15
    )
  }

  const top = springY + halfSpan * 0.55 + 0.7
  return mergeParts(parts.map((p) => paintRock(p, kind, 0, top)))
}

export function buildFloatingIsland(rand: Rand): THREE.BufferGeometry {
  const radius = 3.2 + rand() * 1.8
  const parts: THREE.BufferGeometry[] = []

  const top = prepare(new THREE.CylinderGeometry(radius, radius * 0.92, 0.7, 10))
  jitter(top, 0.18)
  top.translate(0, 0.35, 0)
  parts.push(
    paint(top, (f, out) =>
      f.ny > 0.6
        ? hsl(out, 0.28 + (f.noise - 0.5) * 0.03, 0.5, 0.34 + f.noise * 0.06)
        : hsl(out, 0.07, 0.3, 0.2 + f.noise * 0.05)
    )
  )

  const under = prepare(new THREE.ConeGeometry(radius * 0.92, radius * 1.7, 8))
  under.rotateX(Math.PI)
  under.translate(0, -radius * 0.85, 0)
  jitter(under, radius * 0.1, 5)
  parts.push(paintRock(under, 'stone', -radius * 1.7, 0))

  const spikes = 3
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * TAU + rand()
    const spike = prepare(new THREE.ConeGeometry(0.4, 1.4, 5))
    spike.rotateX(Math.PI)
    spike.translate(
      Math.cos(angle) * radius * 0.5,
      -radius * 0.9 - 0.2,
      Math.sin(angle) * radius * 0.5
    )
    parts.push(paintRock(spike, 'stone', -radius * 1.7, 0))
  }
  return mergeParts(parts)
}

// ---------------------------------------------------------------- distant mountains

/**
 * A ring of jagged, snow-capped peaks in world space. Their bases sink well below the
 * ground so there is never a gap, and fog gives them a hazy depth.
 */
export function buildMountainRing(
  rand: Rand,
  ringRadius: number,
  count: number
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const baseY = -30

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + (rand() - 0.5) * 0.15
    const distance = ringRadius + (rand() - 0.5) * 50
    const height = 60 + rand() * 90
    const radius = 45 + rand() * 40
    const sides = 6 + Math.floor(rand() * 3)

    const peak = prepare(new THREE.ConeGeometry(radius, height - baseY, sides, 4))
    jitter(peak, radius * 0.1, i * 3)
    peak.rotateY(rand() * TAU)
    peak.translate(
      Math.cos(angle) * distance,
      baseY + (height - baseY) / 2,
      Math.sin(angle) * distance
    )

    const snowLine = height * (0.55 + rand() * 0.1)
    parts.push(
      paint(peak, (f, out) => {
        if (f.y > snowLine && f.ny > -0.1) {
          hsl(out, 0.58, 0.2, 0.86 - (snowLine / (f.y + 1)) * 0.1 + f.noise * 0.04)
        } else if (f.y < 18) {
          hsl(out, 0.38, 0.22, 0.2 + f.noise * 0.04)
        } else {
          hsl(out, 0.6, 0.18, 0.3 + f.ny * 0.06 + f.noise * 0.05)
        }
      })
    )
  }
  return mergeParts(parts)
}
