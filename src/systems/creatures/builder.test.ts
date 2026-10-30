import * as THREE from 'three'
import { beforeAll, describe, expect, it } from 'vitest'
import { spawnCreatureAt } from './builder'
import { generateGenome } from './genome/genome'

// Pattern textures draw to a canvas; a no-op context is enough to build meshes in Node.
beforeAll(() => {
  const context = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === 'createLinearGradient' || property === 'createRadialGradient') {
          return () => ({ addColorStop: () => {} })
        }
        if (property === 'getImageData' || property === 'createImageData') {
          return () => ({ data: new Uint8ClampedArray(512 * 512 * 4) })
        }
        return () => {}
      },
      set: () => true,
    }
  )
  Object.defineProperty(globalThis, 'document', {
    value: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) },
    configurable: true,
  })
})

const SEEDS = Array.from({ length: 60 }, (_, i) => i)

describe('creature builder', () => {
  it('builds finite, reasonably sized creatures that survive animation frames', () => {
    const scene = new THREE.Scene()
    for (const seed of SEEDS) {
      const creature = spawnCreatureAt(scene, new THREE.Vector3(), generateGenome(seed))
      for (let frame = 0; frame < 5; frame++) creature.update(0.016, frame * 0.016)
      creature.group.updateMatrixWorld(true)

      const size = new THREE.Box3().setFromObject(creature.group).getSize(new THREE.Vector3())
      expect([size.x, size.y, size.z].every(Number.isFinite), `seed ${seed}`).toBe(true)
      expect(Math.max(size.x, size.y, size.z), `seed ${seed}`).toBeGreaterThan(0.3)
      expect(Math.max(size.x, size.y, size.z), `seed ${seed}`).toBeLessThan(12)
    }
  })

  it('roots limbs, wings and tails on the torso', () => {
    const scene = new THREE.Scene()
    for (const seed of SEEDS) {
      const genome = generateGenome(seed)
      const creature = spawnCreatureAt(scene, new THREE.Vector3(), genome)
      creature.group.updateMatrixWorld(true)

      // children[0] is the torso shell, [1] the head when present; neck ridges rise toward the head
      const torsoBox = new THREE.Box3()
        .setFromObject(creature.group.children[0])
        .expandByScalar(0.05)
      const skip = genome.head.present ? 2 : 1
      for (const part of creature.group.children.slice(skip)) {
        if (genome.spines.type === 'neck') continue
        expect(torsoBox.containsPoint(part.position), `seed ${seed} ${genome.bodyPlan}`).toBe(true)
      }
    }
  })

  it('shares materials between parts of the same recipe', () => {
    const scene = new THREE.Scene()
    let meshes = 0
    let materials = 0
    for (const seed of SEEDS) {
      const creature = spawnCreatureAt(scene, new THREE.Vector3(), generateGenome(seed))
      const unique = new Set<THREE.Material>()
      creature.group.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          meshes++
          unique.add((object as THREE.Mesh).material as THREE.Material)
        }
      })
      materials += unique.size
    }
    expect(meshes / materials).toBeGreaterThan(2)
  })

  it('stands walkers on the terrain and strides their limbs when moving', () => {
    const scene = new THREE.Scene()
    const slope = (x: number) => 0.5 * x
    let walkers = 0
    for (const seed of SEEDS) {
      const genome = generateGenome(seed)
      if (genome.locomotion !== 'walk') continue
      walkers++

      const creature = spawnCreatureAt(scene, new THREE.Vector3(2, 0, 0), genome, {
        groundHeightAt: slope,
      })
      let time = 0
      for (let frame = 0; frame < 120; frame++) {
        creature.anchor.x += 0.03
        time += 0.016
        creature.update(0.016, time)
      }
      creature.group.updateMatrixWorld(true)
      const lowest = new THREE.Box3().setFromObject(creature.group).min.y
      expect(Math.abs(lowest - slope(creature.anchor.x)), `seed ${seed}`).toBeLessThan(0.35)
    }
    expect(walkers).toBeGreaterThan(5)
  })
})
