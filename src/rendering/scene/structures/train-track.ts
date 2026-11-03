import { STATIONS } from '@systems/track/track-path'
import * as THREE from 'three'

const GAUGE_HALF = 0.72
const BALLAST_HALF_WIDTH = 1.5
const SLEEPER_SPACING = 0.9
const PILLAR_SPACING = 7

const UP = new THREE.Vector3(0, 1, 0)

interface Frame {
  point: THREE.Vector3
  right: THREE.Vector3
  up: THREE.Vector3
  back: THREE.Vector3
}

function frameAt(curve: THREE.Curve<THREE.Vector3>, t: number): Frame {
  const point = curve.getPointAt(t)
  const tangent = curve.getTangentAt(t)
  const right = new THREE.Vector3().crossVectors(tangent, UP).normalize()
  const up = new THREE.Vector3().crossVectors(right, tangent).normalize()
  return { point, right, up, back: tangent.clone().negate() }
}

/**
 * Sweeps a 2D profile (x = sideways, y = up, in metres from the centre line) along the
 * curve as a closed ring. Each profile edge gets its own vertices so the faces stay flat.
 */
function sweepProfile(
  frames: Frame[],
  profile: [number, number][],
  sideOffset: number
): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const n = frames.length
  const edges = profile.length
  const at = (frame: Frame, [px, py]: [number, number]) =>
    frame.point
      .clone()
      .addScaledVector(frame.right, px + sideOffset)
      .addScaledVector(frame.up, py)

  for (let e = 0; e < edges; e++) {
    const a = profile[e] as [number, number]
    const b = profile[(e + 1) % edges] as [number, number]
    for (const frame of frames) {
      const pa = at(frame, a)
      const pb = at(frame, b)
      positions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z)
    }
    const base = e * n * 2
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const a0 = base + i * 2
      const b0 = base + i * 2 + 1
      const a1 = base + j * 2
      const b1 = base + j * 2 + 1
      indices.push(a0, a1, b0, b0, a1, b1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeSignTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#1d3b2a'
    ctx.fillRect(0, 0, 512, 128)
    ctx.strokeStyle = '#e8d9a0'
    ctx.lineWidth = 6
    ctx.strokeRect(6, 6, 500, 116)
    ctx.fillStyle = '#f4ecd0'
    ctx.font = 'bold 44px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 256, 66)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildStation(curve: THREE.Curve<THREE.Vector3>, t: number, name: string): THREE.Group {
  const frame = frameAt(curve, t)
  const station = new THREE.Group()
  station.name = `Station:${name}`

  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 })
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.85 })
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a2e2a, roughness: 0.8 })

  const length = 14
  const width = 3.4
  const sideOffset = 3.0
  // Platform top sits a little above the sleepers; a deep plinth keeps it grounded.
  const topY = 0.3
  const plinthDepth = 4

  const platform = new THREE.Mesh(new THREE.BoxGeometry(width, plinthDepth, length), stone)
  platform.position.y = topY - plinthDepth / 2
  platform.castShadow = true
  platform.receiveShadow = true
  station.add(platform)

  const posts = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz] as const))
  for (const [sx, sz] of posts) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), wood)
    post.position.set(sx * (width / 2 - 0.4), topY + 1.7, sz * (length / 2 - 1.5))
    post.castShadow = true
    station.add(post)
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.25, length - 1.5), roofMat)
  roof.position.y = topY + 3.5
  roof.castShadow = true
  station.add(roof)

  // One face toward the track, one toward the open side, so the text never reads mirrored.
  const signMaterial = new THREE.MeshBasicMaterial({ map: makeSignTexture(name) })
  for (const dir of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.1), signMaterial)
    sign.position.set(dir * 0.05, topY + 2.6, 0)
    sign.rotation.y = (dir * Math.PI) / 2
    station.add(sign)
  }

  const lamp = new THREE.PointLight(0xffd9a0, 0.8, 14)
  lamp.position.set(0, topY + 3, 0)
  station.add(lamp)

  // Orient: local +Z along the track, +X sideways to the platform side.
  const basis = new THREE.Matrix4().makeBasis(frame.right, UP, frame.back.clone().negate())
  station.quaternion.setFromRotationMatrix(basis)
  station.position
    .copy(frame.point)
    .addScaledVector(frame.right, sideOffset)
    .add(new THREE.Vector3(0, -0.02, 0))
  return station
}

/**
 * Builds a real railway over the loop: gravel bed, two steel rails, wooden sleepers,
 * support pillars where the line rises off the ground, and a platform at each station.
 */
export function buildTrainTrack(
  trackCurve: THREE.CatmullRomCurve3,
  heightAt: (x: number, z: number) => number
): THREE.Group {
  const group = new THREE.Group()
  group.name = 'TrainTrack'

  const length = trackCurve.getLength()
  const frameCount = Math.max(64, Math.ceil(length / 0.6))
  const frames: Frame[] = []
  for (let i = 0; i < frameCount; i++) frames.push(frameAt(trackCurve, i / frameCount))

  // Gravel bed
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x6d675f, roughness: 1 })
  const bed = new THREE.Mesh(
    sweepProfile(
      frames,
      [
        [-BALLAST_HALF_WIDTH, -0.4],
        [-BALLAST_HALF_WIDTH + 0.45, 0],
        [BALLAST_HALF_WIDTH - 0.45, 0],
        [BALLAST_HALF_WIDTH, -0.4],
      ],
      0
    ),
    ballastMat
  )
  bed.receiveShadow = true
  group.add(bed)

  // Steel rails
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    metalness: 0.8,
    roughness: 0.35,
  })
  const railProfile: [number, number][] = [
    [-0.05, 0.12],
    [0.05, 0.12],
    [0.05, 0.3],
    [-0.05, 0.3],
  ]
  for (const side of [-GAUGE_HALF, GAUGE_HALF]) {
    const rail = new THREE.Mesh(sweepProfile(frames, railProfile, side), railMat)
    rail.castShadow = true
    group.add(rail)
  }

  // Sleepers
  const sleeperCount = Math.floor(length / SLEEPER_SPACING)
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 })
  const sleepers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.1, 0.12, 0.3),
    sleeperMat,
    sleeperCount
  )
  const matrix = new THREE.Matrix4()
  for (let i = 0; i < sleeperCount; i++) {
    const f = frameAt(trackCurve, i / sleeperCount)
    matrix.makeBasis(f.right, f.up, f.back)
    matrix.setPosition(f.point.clone().addScaledVector(f.up, 0.06))
    sleepers.setMatrixAt(i, matrix)
  }
  sleepers.castShadow = true
  sleepers.receiveShadow = true
  group.add(sleepers)

  // Support pillars where the line stands clear of the ground
  const pillarSpots: { x: number; z: number; ground: number; top: number }[] = []
  const pillarCount = Math.floor(length / PILLAR_SPACING)
  for (let i = 0; i < pillarCount; i++) {
    const f = frameAt(trackCurve, i / pillarCount)
    const ground = heightAt(f.point.x, f.point.z)
    if (f.point.y - ground > 0.7) {
      pillarSpots.push({ x: f.point.x, z: f.point.z, ground, top: f.point.y - 0.4 })
    }
  }
  if (pillarSpots.length > 0) {
    const pillars = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.3, 1, 8),
      new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.9 }),
      pillarSpots.length
    )
    pillarSpots.forEach((spot, i) => {
      const h = spot.top - spot.ground
      matrix.compose(
        new THREE.Vector3(spot.x, spot.ground + h / 2, spot.z),
        new THREE.Quaternion(),
        new THREE.Vector3(1, h, 1)
      )
      pillars.setMatrixAt(i, matrix)
    })
    pillars.castShadow = true
    group.add(pillars)
  }

  for (const station of STATIONS) {
    group.add(buildStation(trackCurve, station.t, station.name))
  }

  return group
}
