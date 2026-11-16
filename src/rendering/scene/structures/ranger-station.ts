import { RANGER_SITE } from '@systems/layout/park-sites'
import * as THREE from 'three'

export function buildRangerStation(): THREE.Group {
  const stationGroup = new THREE.Group()
  stationGroup.name = 'RangerStation'

  // Building base/foundation
  const foundationGeometry = new THREE.BoxGeometry(10, 0.3, 8)
  const foundationMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.9,
  })
  const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial)
  foundation.position.set(0, 0.15, 0)
  foundation.castShadow = true
  foundation.receiveShadow = true
  stationGroup.add(foundation)

  // Main building walls
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
  })

  const mainWallGeometry = new THREE.BoxGeometry(10, 4, 8)
  const mainWall = new THREE.Mesh(mainWallGeometry, wallMaterial)
  mainWall.position.set(0, 2.3, 0)
  mainWall.castShadow = true
  mainWall.receiveShadow = true
  stationGroup.add(mainWall)

  // Roof
  const roofGeometry = new THREE.ConeGeometry(7, 2.5, 4)
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.9,
  })
  const roof = new THREE.Mesh(roofGeometry, roofMaterial)
  roof.position.set(0, 5.55, 0)
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  stationGroup.add(roof)

  // Door
  const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.2)
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.7,
  })
  const door = new THREE.Mesh(doorGeometry, doorMaterial)
  door.position.set(0, 1.55, 4.1)
  door.castShadow = true
  stationGroup.add(door)

  // Door handle
  const handleGeometry = new THREE.SphereGeometry(0.1, 8, 8)
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.8,
    roughness: 0.2,
  })
  const handle = new THREE.Mesh(handleGeometry, handleMaterial)
  handle.position.set(0.5, 1.55, 4.2)
  stationGroup.add(handle)

  // Windows (4 windows)
  const windowGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.15)
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.5,
  })

  const windowPositions = [
    { x: -2.5, y: 2.5, z: 4.05 },
    { x: 2.5, y: 2.5, z: 4.05 },
    { x: -5.05, y: 2.5, z: 0, rotY: Math.PI / 2 },
    { x: 5.05, y: 2.5, z: 0, rotY: Math.PI / 2 },
  ]

  windowPositions.forEach((pos) => {
    const window = new THREE.Mesh(windowGeometry, windowMaterial)
    window.position.set(pos.x, pos.y, pos.z)
    if (pos.rotY) window.rotation.y = pos.rotY
    window.castShadow = true
    stationGroup.add(window)
  })

  // Chimney
  const chimneyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 3, 8)
  const chimneyMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
  })
  const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial)
  chimney.position.set(3, 5.8, 2)
  chimney.castShadow = true
  stationGroup.add(chimney)

  // Porch
  const porchFloorGeometry = new THREE.BoxGeometry(10, 0.2, 2)
  const porchFloor = new THREE.Mesh(porchFloorGeometry, wallMaterial)
  porchFloor.position.set(0, 0.4, 5)
  porchFloor.castShadow = true
  porchFloor.receiveShadow = true
  stationGroup.add(porchFloor)

  // Porch posts
  const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 8)
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.8,
  })

  const porchPostPositions = [
    { x: -4.5, z: 5 },
    { x: 4.5, z: 5 },
  ]

  porchPostPositions.forEach((pos) => {
    const post = new THREE.Mesh(postGeometry, postMaterial)
    post.position.set(pos.x, 1.5, pos.z)
    post.castShadow = true
    stationGroup.add(post)
  })

  // Porch roof
  const porchRoofGeometry = new THREE.BoxGeometry(10, 0.2, 2.5)
  const porchRoof = new THREE.Mesh(porchRoofGeometry, roofMaterial)
  porchRoof.position.set(0, 2.6, 5.2)
  porchRoof.rotation.x = -0.2
  porchRoof.castShadow = true
  stationGroup.add(porchRoof)

  // Sign: "RANGER STATION"
  const signBoardGeometry = new THREE.BoxGeometry(4, 1, 0.2)
  const signBoardMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5f2d,
    roughness: 0.7,
  })
  const signBoard = new THREE.Mesh(signBoardGeometry, signBoardMaterial)
  signBoard.position.set(0, 3.5, 5.5)
  signBoard.castShadow = true
  stationGroup.add(signBoard)

  // Sign text (simplified)
  const signTextGeometry = new THREE.BoxGeometry(3, 0.4, 0.1)
  const signTextMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
  })
  const signText = new THREE.Mesh(signTextGeometry, signTextMaterial)
  signText.position.set(0, 3.5, 5.6)
  stationGroup.add(signText)

  // Flag pole
  const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 6, 8)
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.7,
    roughness: 0.3,
  })
  const pole = new THREE.Mesh(poleGeometry, poleMaterial)
  pole.position.set(-6, 3.5, 0)
  pole.castShadow = true
  stationGroup.add(pole)

  // Flag
  const flagGeometry = new THREE.PlaneGeometry(2, 1.2)
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5f2d,
    side: THREE.DoubleSide,
    roughness: 0.8,
  })
  const flag = new THREE.Mesh(flagGeometry, flagMaterial)
  flag.position.set(-5, 5.5, 0)
  stationGroup.add(flag)

  // Position the ranger station near the entrance but off to the side
  stationGroup.position.set(RANGER_SITE.x, 0, RANGER_SITE.z)
  stationGroup.rotation.y = RANGER_SITE.rot

  return stationGroup
}
