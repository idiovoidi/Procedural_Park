import { TAU } from '@core/constants'
import * as THREE from 'three'

export function createTree(rand: () => number): THREE.Group {
  const group = new THREE.Group()

  // Trunk
  const trunkHeight = 2 + rand() * 2
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight)
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 })
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
  trunk.position.y = trunkHeight / 2 // Position so base is at y=0
  group.add(trunk)

  // Foliage
  const foliageGeometry = new THREE.SphereGeometry(1.5 + rand() * 1)
  const foliageColor = new THREE.Color().setHSL(0.3, 0.6 + rand() * 0.3, 0.3 + rand() * 0.2)
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: foliageColor })
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
  foliage.position.y = trunkHeight + 0.5 + rand() * 1 // Position above trunk
  group.add(foliage)

  // Store trunk height for proper scaling compensation
  group.userData = { trunkHeight }

  return group
}

export function createGrass(rand: () => number): THREE.Mesh {
  const height = 0.5 + rand() * 0.5
  const geometry = new THREE.ConeGeometry(0.1, height, 3)
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.3, 0.7, 0.4 + rand() * 0.3),
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = height / 2 // Position so base is at y=0
  return mesh
}

export function createWetlandPlant(rand: () => number): THREE.Group {
  const group = new THREE.Group()

  // Stem
  const stemHeight = 1 + rand() * 1
  const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, stemHeight)
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a2d })
  const stem = new THREE.Mesh(stemGeometry, stemMaterial)
  stem.position.y = stemHeight / 2 // Position so base is at y=0
  group.add(stem)

  // Lily pad or flower
  if (rand() > 0.6) {
    const padGeometry = new THREE.CircleGeometry(0.5 + rand() * 0.5)
    const padMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59 })
    const pad = new THREE.Mesh(padGeometry, padMaterial)
    pad.rotation.x = -Math.PI / 2
    pad.position.y = 0.1
    group.add(pad)
  }

  return group
}

export function createCrystalFormation(rand: () => number): THREE.Mesh {
  const size = 0.5 + rand() * 1
  const geometry = new THREE.OctahedronGeometry(size)
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.6 + rand() * 0.3, 0.8, 0.7),
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.3,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = size / 2 // Position so base is at y=0
  return mesh
}

export function createMountain(
  group: THREE.Group,
  x: number,
  z: number,
  minHeight: number,
  heightVar: number,
  minWidth: number,
  widthVar: number,
  hue: number = 0.55 + Math.random() * 0.15,
  brightness: number = 0.15 + Math.random() * 0.1
): void {
  const height = minHeight + Math.random() * heightVar
  const width = minWidth + Math.random() * widthVar
  const segments = 4 + Math.floor(Math.random() * 2)
  const geometry = new THREE.ConeGeometry(width, height, segments)
  const color = new THREE.Color().setHSL(hue, 0.25, brightness)

  const material = new THREE.MeshBasicMaterial({
    color,
    fog: true,
  })

  const mountain = new THREE.Mesh(geometry, material)
  mountain.position.set(x, height / 2 - 10, z)
  mountain.rotation.y = Math.random() * TAU

  group.add(mountain)
}
