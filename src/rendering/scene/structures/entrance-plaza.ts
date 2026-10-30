import { TAU } from '@core/constants'
import * as THREE from 'three'

export function buildEntrancePlaza(): THREE.Group {
  const plazaGroup = new THREE.Group()
  plazaGroup.name = 'EntrancePlaza'

  // Plaza floor (decorative paving)
  const plazaGeometry = new THREE.CircleGeometry(15, 32)
  const plazaMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.8,
    metalness: 0.1,
  })
  const plaza = new THREE.Mesh(plazaGeometry, plazaMaterial)
  plaza.rotation.x = -Math.PI / 2
  plaza.position.set(0, 0.1, 45)
  plaza.receiveShadow = true
  plazaGroup.add(plaza)

  // Decorative pattern on plaza (concentric circles)
  for (let i = 1; i <= 3; i++) {
    const ringGeometry = new THREE.RingGeometry(i * 4, i * 4 + 0.3, 32)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, 0.15, 45)
    plazaGroup.add(ring)
  }

  // Central fountain
  const fountainBase = new THREE.CylinderGeometry(3, 3.5, 1, 16)
  const fountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.6,
    metalness: 0.3,
  })
  const base = new THREE.Mesh(fountainBase, fountainMaterial)
  base.position.set(0, 0.5, 45)
  base.castShadow = true
  base.receiveShadow = true
  plazaGroup.add(base)

  // Fountain bowl
  const bowlGeometry = new THREE.SphereGeometry(2, 16, 16, 0, TAU, 0, Math.PI / 2)
  const bowlMaterial = new THREE.MeshStandardMaterial({
    color: 0x6699cc,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.8,
  })
  const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial)
  bowl.position.set(0, 1, 45)
  plazaGroup.add(bowl)

  // Water effect (simple blue sphere)
  const waterGeometry = new THREE.SphereGeometry(1.8, 16, 16)
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
  })
  const water = new THREE.Mesh(waterGeometry, waterMaterial)
  water.position.set(0, 1.2, 45)
  water.scale.y = 0.3
  plazaGroup.add(water)

  // Benches around plaza (4 benches)
  const benchPositions = [
    { x: 10, z: 45, rotation: Math.PI / 2 },
    { x: -10, z: 45, rotation: -Math.PI / 2 },
    { x: 0, z: 55, rotation: 0 },
    { x: 0, z: 35, rotation: Math.PI },
  ]

  benchPositions.forEach((pos) => {
    const bench = createBench()
    bench.position.set(pos.x, 0, pos.z)
    bench.rotation.y = pos.rotation
    plazaGroup.add(bench)
  })

  // Lamp posts (4 around plaza)
  const lampPositions = [
    { x: 12, z: 52 },
    { x: -12, z: 52 },
    { x: 12, z: 38 },
    { x: -12, z: 38 },
  ]

  lampPositions.forEach((pos) => {
    const lamp = createLampPost()
    lamp.position.set(pos.x, 0, pos.z)
    plazaGroup.add(lamp)
  })

  return plazaGroup
}

function createBench(): THREE.Group {
  const benchGroup = new THREE.Group()

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
  })

  // Seat
  const seatGeometry = new THREE.BoxGeometry(2, 0.2, 0.6)
  const seat = new THREE.Mesh(seatGeometry, woodMaterial)
  seat.position.y = 0.5
  seat.castShadow = true
  benchGroup.add(seat)

  // Backrest
  const backGeometry = new THREE.BoxGeometry(2, 0.8, 0.1)
  const back = new THREE.Mesh(backGeometry, woodMaterial)
  back.position.set(0, 0.9, -0.25)
  back.castShadow = true
  benchGroup.add(back)

  // Legs (4)
  const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8)
  const legPositions = [
    { x: -0.8, z: 0.2 },
    { x: 0.8, z: 0.2 },
    { x: -0.8, z: -0.2 },
    { x: 0.8, z: -0.2 },
  ]

  legPositions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeometry, woodMaterial)
    leg.position.set(pos.x, 0.25, pos.z)
    leg.castShadow = true
    benchGroup.add(leg)
  })

  return benchGroup
}

function createLampPost(): THREE.Group {
  const lampGroup = new THREE.Group()

  // Post
  const postGeometry = new THREE.CylinderGeometry(0.1, 0.15, 4, 8)
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.7,
    roughness: 0.3,
  })
  const post = new THREE.Mesh(postGeometry, postMaterial)
  post.position.y = 2
  post.castShadow = true
  lampGroup.add(post)

  // Lamp head
  const lampGeometry = new THREE.SphereGeometry(0.4, 16, 16)
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffff88,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9,
  })
  const lamp = new THREE.Mesh(lampGeometry, lampMaterial)
  lamp.position.y = 4.3
  lampGroup.add(lamp)

  // Light source
  const light = new THREE.PointLight(0xffffcc, 1.5, 20)
  light.position.y = 4.3
  light.castShadow = true
  light.shadow.mapSize.width = 512
  light.shadow.mapSize.height = 512
  lampGroup.add(light)

  return lampGroup
}
