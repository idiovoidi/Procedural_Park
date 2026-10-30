/**
 * Dev-only creature preview: renders a grid of consecutive seeds so generator
 * changes can be judged by eye. Not part of the production build.
 *
 * Open /Procedural_Park/creature-preview.html?seed=0 while `npm run dev` is running.
 *   Left / Right arrows: previous / next page of seeds
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
}
let cells: Cell[] = []

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

    const creature = spawnCreatureAt(scene, new THREE.Vector3(), genome)
    pivot.add(creature.group)

    const label = document.createElement('div')
    label.className = 'label'
    label.innerHTML = `${seed} ${generateSpeciesName(genome)}<small>${genome.bodyPlan} · ${genome.archetype} · r${genome.rarity.toFixed(2)}</small>`
    document.body.appendChild(label)

    cells.push({ pivot, creature, label, anchorPoint: pivot.position.clone().setY(-1.6) })
  }
  hud.textContent = `Seeds ${firstSeed}–${firstSeed + PAGE_SIZE - 1}  ·  ←/→ page  ·  invalid genomes: ${invalid}`
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
    // Hold each creature at its pedestal and facing the camera; behavior would wander it away
    cell.creature.anchor.set(0, 0, 0)
    cell.creature.update(dt, t, camera, [])
    cell.creature.group.rotation.y = 0

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
