import { TAU } from '@core/constants'
import * as THREE from 'three'

export interface LabSign {
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
}

export function drawLabSignText(sign: LabSign, text: string): void {
  const { canvas, texture } = sign
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw dark background for contrast
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Set text properties
  ctx.font = 'bold 48px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Draw glowing effect (multiple layers)
  ctx.shadowBlur = 20
  ctx.shadowColor = '#00ffff'

  // Outer glow
  ctx.fillStyle = '#00ffff'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  // Inner bright text
  ctx.shadowBlur = 10
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  // Update texture
  texture.needsUpdate = true
}

export function buildExperimentLab(): { group: THREE.Group; sign: LabSign } {
  const labGroup = new THREE.Group()
  labGroup.name = 'ExperimentLab'

  // Glass dome structure
  const domeGeometry = new THREE.SphereGeometry(8, 32, 32, 0, TAU, 0, Math.PI / 2)
  const domeMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.3,
    metalness: 0.5,
    roughness: 0.1,
    side: THREE.DoubleSide,
  })
  const dome = new THREE.Mesh(domeGeometry, domeMaterial)
  dome.position.y = 0.5
  labGroup.add(dome)

  // Floor platform
  const platformGeometry = new THREE.CylinderGeometry(8, 8, 0.5, 32)
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.6,
    roughness: 0.4,
  })
  const platform = new THREE.Mesh(platformGeometry, platformMaterial)
  platform.position.y = 0.25
  platform.castShadow = true
  platform.receiveShadow = true
  labGroup.add(platform)

  // Central pedestal for creature
  const pedestalGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 16)
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.7,
    roughness: 0.3,
  })
  const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial)
  pedestal.position.y = 1
  pedestal.castShadow = true
  pedestal.receiveShadow = true
  labGroup.add(pedestal)

  // Glowing ring around pedestal
  const ringGeometry = new THREE.TorusGeometry(2.3, 0.1, 16, 32)
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.8,
    metalness: 0.8,
    roughness: 0.2,
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.position.y = 1.5
  ring.rotation.x = Math.PI / 2
  labGroup.add(ring)

  // Support pillars
  const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 8)
  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.7,
    roughness: 0.3,
  })

  const pillarCount = 6
  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * TAU
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
    pillar.position.set(Math.cos(angle) * 7, 4, Math.sin(angle) * 7)
    pillar.castShadow = true
    labGroup.add(pillar)

    // Lights on pillars
    const lightGeometry = new THREE.SphereGeometry(0.3, 16, 16)
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1,
    })
    const light = new THREE.Mesh(lightGeometry, lightMaterial)
    light.position.set(Math.cos(angle) * 7, 7.5, Math.sin(angle) * 7)
    labGroup.add(light)

    const pointLight = new THREE.PointLight(0x00ffff, 1, 15)
    pointLight.position.copy(light.position)
    labGroup.add(pointLight)
  }

  // Sign
  const signGeometry = new THREE.BoxGeometry(5, 1.5, 0.2)
  const signMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.5,
    roughness: 0.5,
  })
  const sign = new THREE.Mesh(signGeometry, signMaterial)
  sign.position.set(0, 2, 8.5)
  sign.castShadow = true
  labGroup.add(sign)

  // Create canvas texture for creature name text
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const texture = new THREE.CanvasTexture(canvas)
  const labSign: LabSign = { canvas, texture }

  // Draw initial text
  drawLabSignText(labSign, 'EXPERIMENT LAB')

  // Sign text plane with canvas texture
  const textGeometry = new THREE.PlaneGeometry(4.5, 1.2)
  const textMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  })
  const textMesh = new THREE.Mesh(textGeometry, textMaterial)
  textMesh.position.set(0, 2.3, 8.61)
  labGroup.add(textMesh)

  // Position lab away from main path
  labGroup.position.set(-35, 0, -20)
  labGroup.userData.isExperimentLab = true

  return { group: labGroup, sign: labSign }
}
