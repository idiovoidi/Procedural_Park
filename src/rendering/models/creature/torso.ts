import { HALF_PI } from '@core/constants'
import type { Random } from '@core/types'
import { BODY_PLANS } from '@systems/creatures/genome/body-plans'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getBodyTypeScale, getSizeMultiplier } from './body-types'
import { type CreaturePalette, createCreatureMaterial } from './palette'
import { type BodyBounds, boundsFromBox, shapeForTorso } from './sockets'

export type BodyShell = {
  object: THREE.Object3D
  /** Half extents of the finished body, centered on the creature origin. */
  bounds: BodyBounds
  /** Spine segments for bodies that undulate (serpents). */
  segments: THREE.Object3D[]
}

/** Per-axis multipliers combining body type, plan proportions and individual genes. */
function getProportions(anatomy: Anatomy) {
  const bodyScale = getBodyTypeScale(anatomy.bodyType)
  const plan = BODY_PLANS[anatomy.bodyPlan].proportion
  const girth = 0.88 + anatomy.genes.girth * 0.24
  const length = 0.88 + anatomy.genes.length * 0.28
  return {
    width: bodyScale.width * plan.width * girth,
    height: bodyScale.height * plan.height * girth,
    length: bodyScale.length * plan.length * length,
  }
}

/**
 * Build the torso in a canonical frame (length along +z, width along x, height
 * along y), then recenter it and measure its bounds for part sockets.
 */
export function buildTorso(rand: Random, anatomy: Anatomy, palette: CreaturePalette): BodyShell {
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const p = getProportions(anatomy)
  const material = createCreatureMaterial(anatomy, palette, rand)
  const segments: THREE.Object3D[] = []
  let object: THREE.Object3D

  switch (anatomy.torsoShape) {
    case 'sphere': {
      object = new THREE.Mesh(new THREE.SphereGeometry(0.6 * sizeMultiplier, 28, 28), material)
      object.scale.set(p.width, 0.9 * p.height, 1.1 * p.length)
      break
    }
    case 'ellipsoid': {
      object = new THREE.Mesh(new THREE.SphereGeometry(0.5 * sizeMultiplier, 28, 28), material)
      object.scale.set(0.7 * p.width, 0.6 * p.height, 1.3 * p.length)
      break
    }
    case 'capsule': {
      // The capsule's axis is Y; turn it to lie along z. After the turn the mesh's
      // local y scales length and local z scales height.
      object = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4 * sizeMultiplier, 0.8 * sizeMultiplier, 8, 16),
        material
      )
      object.rotation.x = HALF_PI
      object.scale.set(p.width, p.length, p.height)
      break
    }
    case 'box': {
      object = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.8 * sizeMultiplier * p.width,
          0.6 * sizeMultiplier * p.height,
          1.0 * sizeMultiplier * p.length,
          4,
          4,
          4
        ),
        material
      )
      break
    }
    case 'crystal': {
      object = new THREE.Mesh(
        new THREE.OctahedronGeometry((0.8 + rand() * 0.4) * sizeMultiplier, 1),
        material
      )
      object.scale.set(0.85 * p.width, 1.15 * p.height, 0.85 * p.length)
      break
    }
    case 'cloud': {
      object = buildCloud(rand, anatomy, palette, sizeMultiplier, p)
      break
    }
    case 'segmented': {
      object = buildSegmentedBody(rand, anatomy, material, sizeMultiplier, p, segments)
      break
    }
  }

  // Wrap and recenter so every shape sits on the creature origin.
  const shell = new THREE.Group()
  shell.add(object)
  shell.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(shell)
  const center = box.getCenter(new THREE.Vector3())
  object.position.sub(center)
  shell.updateMatrixWorld(true)

  return { object: shell, bounds: boundsFromBox(box, shapeForTorso(anatomy.torsoShape)), segments }
}

/** Overlapping puffs on a golden-angle spiral: a loose blob with a denser core. */
function buildCloud(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  sizeMultiplier: number,
  p: { width: number; height: number; length: number }
): THREE.Object3D {
  const cloud = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: palette.base,
    transparent: true,
    opacity: 0.7,
    metalness: 0.1,
    roughness: 0.9,
  })
  if (anatomy.genes.glow > 0) {
    material.emissive.copy(palette.accent)
    material.emissiveIntensity = 0.35 * anatomy.genes.glow
  }

  const puffs = 6 + Math.floor(rand() * 2)
  for (let i = 0; i < puffs; i++) {
    const t = i / puffs
    const angle = i * 2.4
    const ring = 0.2 + 0.9 * t
    const radius = (0.62 - 0.28 * t + rand() * 0.08) * sizeMultiplier
    const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material)
    puff.position.set(
      Math.cos(angle) * ring * sizeMultiplier * p.width,
      (i % 2 === 0 ? 1 : -1) * 0.2 * t * sizeMultiplier * p.height,
      Math.sin(angle) * ring * sizeMultiplier * p.length
    )
    cloud.add(puff)
  }
  return cloud
}

/**
 * A chain of overlapping spheres from head end (+z) to tail tip (-z), thickest
 * just behind the head and tapering to a point. The segments are returned so
 * the rig can ripple them.
 */
function buildSegmentedBody(
  rand: Random,
  anatomy: Anatomy,
  material: THREE.Material,
  sizeMultiplier: number,
  p: { width: number; height: number; length: number },
  segments: THREE.Object3D[]
): THREE.Object3D {
  const body = new THREE.Group()
  const count = 7 + Math.round(anatomy.genes.length * 3) + Math.floor(rand() * 2)
  const maxRadius = 0.34 * sizeMultiplier

  let z = 0
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const radius =
      maxRadius *
      (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.6))) *
      (1 - 0.82 * t ** 1.6)
    const segment = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(radius, 0.04), 18, 14),
      material
    )
    segment.scale.set(p.width, p.height, 1)
    segment.position.z = z
    body.add(segment)
    segments.push(segment)
    z -= radius * 1.15 * p.length
  }
  return body
}
