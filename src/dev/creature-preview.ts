/**
 * Dev-only creature preview: renders a grid of consecutive seeds so generator
 * changes can be judged by eye. Not part of the production build.
 *
 * Open /Procedural_Park/creature-preview.html?seed=0 while `npm run dev` is running.
 *   Left / Right arrows: previous / next page of seeds
 *   H: toggle between holding creatures in place and letting them wander (shows gaits)
 *   Drag: orbit, wheel: zoom
 */

import {
  type CreatureInstance,
  generateGenome,
  generateSpeciesName,
  spawnCreatureAt,
  validateGenome,
} from '@systems/creatures'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const COLUMNS = 6
const ROWS = 4
const PAGE_SIZE = COLUMNS * ROWS
const SPACING = 6
// Fliers and drifters hover at this height above the pedestal
const HOVER_HEIGHT = 1.6
const WANDER_LIMIT = 2.4

const params = new URLSearchParams(location.search)
let firstSeed = Math.max(0, Number.parseInt(params.get('seed') ?? '0', 10) || 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x14161c)
scene.add(new THREE.HemisphereLight(0xffffff, 0x404858, 1.1))
const sun = new THREE.DirectionalLight(0xffffff, 1.4)
sun.position.set(6, 12, 8)
scene.add(sun)

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
camera.position.set(0, 16, 26)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1, 0)

const hud = document.getElementById('hud') as HTMLDivElement

type Cell = {
  pivot: THREE.Group
  creature: CreatureInstance
  label: HTMLDivElement
  anchorPoint: THREE.Vector3
  grounded: boolean
}
let cells: Cell[] = []
let holdStill = true

function clearPage(): void {
  for (const cell of cells) {
    scene.remove(cell.pivot)
    cell.label.remove()
  }
  cells = []
}

function buildPage(): void {
  clearPage()
  let invalid = 0
  for (let i = 0; i < PAGE_SIZE; i++) {
    const seed = firstSeed + i
    const genome = generateGenome(seed)
    if (validateGenome(genome).length > 0) invalid++

    const column = i % COLUMNS
    const row = Math.floor(i / COLUMNS)
    const pivot = new THREE.Group()
    pivot.position.set((column - (COLUMNS - 1) / 2) * SPACING, 0, (row - (ROWS - 1) / 2) * SPACING)
    pivot.rotation.y = 0.5
    scene.add(pivot)

    const grounded = genome.locomotion === 'walk' || genome.locomotion === 'slither'
    const creature = spawnCreatureAt(
      scene,
      new THREE.Vector3(0, grounded ? 0 : HOVER_HEIGHT, 0),
      genome,
      { groundHeightAt: () => 0 }
    )
    pivot.add(creature.group)

    const pedestal = new THREE.Mesh(
      new THREE.CircleGeometry(SPACING * 0.45, 40),
      new THREE.MeshStandardMaterial({ color: 0x232733 })
    )
    pedestal.rotation.x = -Math.PI / 2
    pedestal.position.y = -0.01
    pivot.add(pedestal)

    const label = document.createElement('div')
    label.className = 'label'
    label.innerHTML = `${seed} ${generateSpeciesName(genome)}<small>${genome.bodyPlan} · ${genome.archetype} · r${genome.rarity.toFixed(2)}</small>`
    document.body.appendChild(label)

    cells.push({ pivot, creature, label, grounded, anchorPoint: pivot.position.clone().setY(-1.6) })
  }
  hud.textContent = `Seeds ${firstSeed}–${firstSeed + PAGE_SIZE - 1}  ·  ←/→ page  ·  H: ${holdStill ? 'let them wander' : 'hold still'}  ·  invalid genomes: ${invalid}`
}

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', resize)
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') firstSeed += PAGE_SIZE
  else if (event.key === 'ArrowLeft') firstSeed = Math.max(0, firstSeed - PAGE_SIZE)
  else if (event.key.toLowerCase() === 'h') holdStill = !holdStill
  else return
  history.replaceState(null, '', `?seed=${firstSeed}`)
  buildPage()
})

const clock = new THREE.Clock()
const projected = new THREE.Vector3()

function frame(): void {
  const dt = Math.min(clock.getDelta(), 0.1)
  const t = clock.elapsedTime

  for (const cell of cells) {
    const { anchor, group } = cell.creature
    if (holdStill) {
      // Pin to the pedestal and face the camera; behavior would wander it away
      anchor.x = 0
      anchor.z = 0
      if (!cell.grounded) anchor.y = HOVER_HEIGHT
    } else if (Math.hypot(anchor.x, anchor.z) > WANDER_LIMIT) {
      // Free roaming, but pull back toward the pedestal so it stays in its cell
      anchor.x *= 0.2
      anchor.z *= 0.2
    }
    cell.creature.update(dt, t, camera, [])
    if (holdStill) group.rotation.y = 0

    projected.copy(cell.anchorPoint).project(camera)
    cell.label.style.left = `${((projected.x + 1) / 2) * window.innerWidth}px`
    cell.label.style.top = `${((1 - projected.y) / 2) * window.innerHeight}px`
  }

  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

resize()
buildPage()
frame()
