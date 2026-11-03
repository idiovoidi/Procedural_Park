import { GATE_SITE } from '@systems/layout/park-sites'
import * as THREE from 'three'

export function buildMainGate(): THREE.Group {
  const gateGroup = new THREE.Group()
  gateGroup.name = 'MainGate'

  // Gate pillars (two tall columns)
  const pillarGeometry = new THREE.BoxGeometry(2, 8, 2)
  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
    metalness: 0.2,
  })

  // Left pillar
  const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
  leftPillar.position.set(-6, 4, 0)
  leftPillar.castShadow = true
  leftPillar.receiveShadow = true
  gateGroup.add(leftPillar)

  // Right pillar
  const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
  rightPillar.position.set(6, 4, 0)
  rightPillar.castShadow = true
  rightPillar.receiveShadow = true
  gateGroup.add(rightPillar)

  // Pillar caps (decorative tops)
  const capGeometry = new THREE.CylinderGeometry(1.5, 1.2, 1, 8)
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.6,
    roughness: 0.3,
  })

  const leftCap = new THREE.Mesh(capGeometry, capMaterial)
  leftCap.position.set(-6, 8.5, 0)
  leftCap.castShadow = true
  gateGroup.add(leftCap)

  const rightCap = new THREE.Mesh(capGeometry, capMaterial)
  rightCap.position.set(6, 8.5, 0)
  rightCap.castShadow = true
  gateGroup.add(rightCap)

  // Arch connecting the pillars
  const archCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-6, 8, 0),
    new THREE.Vector3(0, 12, 0),
    new THREE.Vector3(6, 8, 0)
  )
  const archPoints = archCurve.getPoints(50)
  const archGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(archPoints),
    50,
    0.4,
    8,
    false
  )
  const archMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.7,
    metalness: 0.3,
  })
  const arch = new THREE.Mesh(archGeometry, archMaterial)
  arch.castShadow = true
  gateGroup.add(arch)

  // Welcome sign
  const signGeometry = new THREE.BoxGeometry(8, 2, 0.3)
  const signMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
  })
  const sign = new THREE.Mesh(signGeometry, signMaterial)
  sign.position.set(0, 10, 0)
  sign.castShadow = true
  gateGroup.add(sign)

  // Sign text (using simple geometry)
  const textMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5f2d,
    emissive: 0x2c5f2d,
    emissiveIntensity: 0.2,
  })

  // Create "WILDLIFE PARK" using simple shapes
  const letterGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.1)
  const letters = [
    { x: -3.5, y: 10, z: 0.2 }, // W
    { x: -2.8, y: 10, z: 0.2 }, // I
    { x: -2.1, y: 10, z: 0.2 }, // L
    { x: -1.4, y: 10, z: 0.2 }, // D
    { x: -0.5, y: 10, z: 0.2 }, // (space)
    { x: 0.2, y: 10, z: 0.2 }, // P
    { x: 0.9, y: 10, z: 0.2 }, // A
    { x: 1.6, y: 10, z: 0.2 }, // R
    { x: 2.3, y: 10, z: 0.2 }, // K
  ]

  letters.forEach((pos) => {
    const letter = new THREE.Mesh(letterGeometry, textMaterial)
    letter.position.set(pos.x, pos.y, pos.z)
    gateGroup.add(letter)
  })

  // Decorative lanterns on pillars
  const lanternGeometry = new THREE.SphereGeometry(0.5, 16, 16)
  const lanternMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffa500,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.9,
  })

  const leftLantern = new THREE.Mesh(lanternGeometry, lanternMaterial)
  leftLantern.position.set(-6, 7, 0)
  gateGroup.add(leftLantern)

  // Add point light to lantern
  const leftLight = new THREE.PointLight(0xffa500, 1, 10)
  leftLight.position.copy(leftLantern.position)
  gateGroup.add(leftLight)

  const rightLantern = new THREE.Mesh(lanternGeometry, lanternMaterial)
  rightLantern.position.set(6, 7, 0)
  gateGroup.add(rightLantern)

  const rightLight = new THREE.PointLight(0xffa500, 1, 10)
  rightLight.position.copy(rightLantern.position)
  gateGroup.add(rightLight)

  // Position the gate at the park entrance (adjust based on your track)
  gateGroup.position.set(GATE_SITE.x, 0, GATE_SITE.z)
  gateGroup.rotation.y = GATE_SITE.rot // Face inward

  return gateGroup
}
