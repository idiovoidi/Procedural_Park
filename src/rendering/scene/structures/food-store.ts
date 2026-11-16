import { STORE_SITE } from '@systems/layout/park-sites'
import * as THREE from 'three'

export function buildFoodStore(): THREE.Group {
  const storeGroup = new THREE.Group()
  storeGroup.name = 'FoodStore'

  // Foundation
  const foundationGeometry = new THREE.BoxGeometry(12, 0.4, 10)
  const foundationMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.9,
  })
  const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial)
  foundation.position.set(0, 0.2, 0)
  foundation.castShadow = true
  foundation.receiveShadow = true
  storeGroup.add(foundation)

  // Main building walls
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8d4a0,
    roughness: 0.8,
  })
  const mainWallGeometry = new THREE.BoxGeometry(12, 5, 10)
  const mainWall = new THREE.Mesh(mainWallGeometry, wallMaterial)
  mainWall.position.set(0, 2.9, 0)
  mainWall.castShadow = true
  mainWall.receiveShadow = true
  storeGroup.add(mainWall)

  // Roof (flat with slight overhang)
  const roofGeometry = new THREE.BoxGeometry(13, 0.4, 11)
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xc85a54,
    roughness: 0.9,
  })
  const roof = new THREE.Mesh(roofGeometry, roofMaterial)
  roof.position.set(0, 5.5, 0)
  roof.castShadow = true
  storeGroup.add(roof)

  // Awning over entrance
  const awningGeometry = new THREE.BoxGeometry(8, 0.2, 2)
  const awningMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    roughness: 0.7,
  })
  const awning = new THREE.Mesh(awningGeometry, awningMaterial)
  awning.position.set(0, 3.5, 5.5)
  awning.rotation.x = -0.3
  awning.castShadow = true
  storeGroup.add(awning)

  // Awning support poles
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8)
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
  })
  const polePositions = [
    { x: -3.5, z: 6 },
    { x: 3.5, z: 6 },
  ]
  polePositions.forEach((pos) => {
    const pole = new THREE.Mesh(poleGeometry, poleMaterial)
    pole.position.set(pos.x, 2.5, pos.z)
    pole.castShadow = true
    storeGroup.add(pole)
  })

  // Double doors
  const doorGeometry = new THREE.BoxGeometry(1.8, 3, 0.2)
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.7,
  })
  const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial)
  leftDoor.position.set(-1, 1.9, 5.1)
  leftDoor.castShadow = true
  storeGroup.add(leftDoor)

  const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial)
  rightDoor.position.set(1, 1.9, 5.1)
  rightDoor.castShadow = true
  storeGroup.add(rightDoor)

  // Door handles
  const handleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8)
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.8,
    roughness: 0.2,
  })
  const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial)
  leftHandle.position.set(-0.2, 1.9, 5.2)
  leftHandle.rotation.z = Math.PI / 2
  storeGroup.add(leftHandle)

  const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial)
  rightHandle.position.set(1.8, 1.9, 5.2)
  rightHandle.rotation.z = Math.PI / 2
  storeGroup.add(rightHandle)

  // Large display windows
  const windowGeometry = new THREE.BoxGeometry(2.5, 2, 0.15)
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.5,
  })
  const windowPositions = [
    { x: -4, y: 2.5, z: 5.05 },
    { x: 4, y: 2.5, z: 5.05 },
    { x: -6.05, y: 2.5, z: 0, rotY: Math.PI / 2 },
    { x: 6.05, y: 2.5, z: 0, rotY: Math.PI / 2 },
  ]
  windowPositions.forEach((pos) => {
    const window = new THREE.Mesh(windowGeometry, windowMaterial)
    window.position.set(pos.x, pos.y, pos.z)
    if (pos.rotY) window.rotation.y = pos.rotY
    window.castShadow = true
    storeGroup.add(window)
  })

  // Store sign board
  const signBoardGeometry = new THREE.BoxGeometry(7, 1.5, 0.3)
  const signBoardMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    roughness: 0.6,
  })
  const signBoard = new THREE.Mesh(signBoardGeometry, signBoardMaterial)
  signBoard.position.set(0, 4.8, 5.2)
  signBoard.castShadow = true
  storeGroup.add(signBoard)

  // Sign text "FOOD STORE"
  const signTextGeometry = new THREE.BoxGeometry(6, 0.8, 0.1)
  const signTextMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
  })
  const signText = new THREE.Mesh(signTextGeometry, signTextMaterial)
  signText.position.set(0, 4.8, 5.35)
  storeGroup.add(signText)

  // Decorative food icons on roof (simple shapes)
  const appleGeometry = new THREE.SphereGeometry(0.4, 16, 16)
  const appleMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    roughness: 0.6,
  })
  const apple = new THREE.Mesh(appleGeometry, appleMaterial)
  apple.position.set(-2, 5.9, 0)
  apple.castShadow = true
  storeGroup.add(apple)

  const carrotGeometry = new THREE.ConeGeometry(0.3, 0.8, 8)
  const carrotMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8c00,
    roughness: 0.7,
  })
  const carrot = new THREE.Mesh(carrotGeometry, carrotMaterial)
  carrot.position.set(2, 5.9, 0)
  carrot.rotation.z = Math.PI
  carrot.castShadow = true
  storeGroup.add(carrot)

  // Shopping cart outside
  const cartGroup = new THREE.Group()
  const cartBodyGeometry = new THREE.BoxGeometry(0.8, 0.6, 1)
  const cartMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.6,
    roughness: 0.4,
  })
  const cartBody = new THREE.Mesh(cartBodyGeometry, cartMaterial)
  cartBody.position.y = 0.5
  cartBody.castShadow = true
  cartGroup.add(cartBody)

  // Cart wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16)
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
  })
  const wheelPositions = [
    { x: -0.3, y: 0.15, z: 0.4 },
    { x: 0.3, y: 0.15, z: 0.4 },
    { x: -0.3, y: 0.15, z: -0.4 },
    { x: 0.3, y: 0.15, z: -0.4 },
  ]
  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheel.position.set(pos.x, pos.y, pos.z)
    wheel.rotation.z = Math.PI / 2
    wheel.castShadow = true
    cartGroup.add(wheel)
  })

  cartGroup.position.set(4.5, 0, 6.5)
  cartGroup.rotation.y = -Math.PI / 6
  storeGroup.add(cartGroup)

  // Outdoor produce crates
  const crateGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.8)
  const crateMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b6914,
    roughness: 0.9,
  })
  const cratePositions = [
    { x: -4.5, z: 6.5 },
    { x: -5.5, z: 6.5 },
    { x: -5, z: 7 },
  ]
  cratePositions.forEach((pos) => {
    const crate = new THREE.Mesh(crateGeometry, crateMaterial)
    crate.position.set(pos.x, 0.5, pos.z)
    crate.castShadow = true
    crate.receiveShadow = true
    storeGroup.add(crate)

    // Add produce on top of crates
    const produceGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const produceColors = [0x4caf50, 0xffeb3b, 0xff5722]
    for (let i = 0; i < 3; i++) {
      const produceMaterial = new THREE.MeshStandardMaterial({
        color: produceColors[i % produceColors.length],
        roughness: 0.7,
      })
      const produce = new THREE.Mesh(produceGeometry, produceMaterial)
      produce.position.set(pos.x + (i - 1) * 0.25, 0.9, pos.z)
      produce.castShadow = true
      storeGroup.add(produce)
    }
  })

  // Outdoor lighting
  const storeLightGeometry = new THREE.SphereGeometry(0.3, 16, 16)
  const storeLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffff88,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.9,
  })
  const storeLightPositions = [
    { x: -5, z: 5 },
    { x: 5, z: 5 },
  ]
  storeLightPositions.forEach((pos) => {
    const lightMesh = new THREE.Mesh(storeLightGeometry, storeLightMaterial)
    lightMesh.position.set(pos.x, 4.5, pos.z)
    storeGroup.add(lightMesh)

    const pointLight = new THREE.PointLight(0xffffcc, 1.2, 15)
    pointLight.position.copy(lightMesh.position)
    pointLight.castShadow = true
    storeGroup.add(pointLight)
  })

  // Position the food store near the entrance plaza
  storeGroup.position.set(STORE_SITE.x, 0, STORE_SITE.z)
  storeGroup.rotation.y = STORE_SITE.rot
  storeGroup.userData.isFoodStore = true

  return storeGroup
}
