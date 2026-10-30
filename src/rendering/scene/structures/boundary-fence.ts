import { TAU } from '@core/constants'
import * as THREE from 'three'

export function buildBoundaryFence(): THREE.Group {
  const fenceGroup = new THREE.Group()
  fenceGroup.name = 'BoundaryFence'

  // Fence parameters
  const fenceHeight = 3
  const parkRadius = 70 // Outer boundary
  const segments = 64 // Number of fence segments

  // Materials
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.9,
  })

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
  })

  // Create circular fence
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * TAU
    const nextAngle = ((i + 1) / segments) * TAU

    const x = Math.cos(angle) * parkRadius
    const z = Math.sin(angle) * parkRadius
    const nextX = Math.cos(nextAngle) * parkRadius
    const nextZ = Math.sin(nextAngle) * parkRadius

    // Fence post
    const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, fenceHeight, 8)
    const post = new THREE.Mesh(postGeometry, postMaterial)
    post.position.set(x, fenceHeight / 2, z)
    post.castShadow = true
    post.receiveShadow = true
    fenceGroup.add(post)

    // Horizontal rails (3 rails per section)
    for (let rail = 0; rail < 3; rail++) {
      const railY = (rail + 1) * (fenceHeight / 4)
      const railLength = Math.sqrt((nextX - x) ** 2 + (nextZ - z) ** 2)

      const railGeometry = new THREE.CylinderGeometry(0.08, 0.08, railLength, 8)
      const railMesh = new THREE.Mesh(railGeometry, railMaterial)

      // Position and rotate rail to connect posts
      railMesh.position.set((x + nextX) / 2, railY, (z + nextZ) / 2)
      railMesh.rotation.z = Math.PI / 2
      railMesh.rotation.y = -angle - Math.PI / 2
      railMesh.castShadow = true
      fenceGroup.add(railMesh)
    }

    // Add decorative elements every 4th post
    if (i % 4 === 0) {
      const decorGeometry = new THREE.SphereGeometry(0.3, 8, 8)
      const decorMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.5,
        roughness: 0.4,
      })
      const decor = new THREE.Mesh(decorGeometry, decorMaterial)
      decor.position.set(x, fenceHeight + 0.3, z)
      decor.castShadow = true
      fenceGroup.add(decor)
    }
  }

  return fenceGroup
}
