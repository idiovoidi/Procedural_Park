/**
 * ParkView
 * Draws the hub build grid: fences, gates, props, roofs and a tint over every closed pen.
 *
 * It owns no game state. Whenever the grid is edited it works out which pieces *should*
 * exist, removes the ones that no longer should, and creates the ones that are new, keyed
 * so unchanged pieces are left alone. Geometry and materials are shared and never rebuilt.
 */

import { GAME_CONFIG } from '@core/constants'
import { type Edge, edgeKey, type PenGrid, type PropKind } from '@systems/park'
import * as THREE from 'three'

const CELL = GAME_CONFIG.PARK.CELL_SIZE_M

const FENCE_H = 1.2
const TALL_FENCE_H = 3
const GATE_H = 1.05
const THICKNESS = 0.14
const ROOF_Y = 3.4

interface Piece {
  signature: string
  object: THREE.Object3D
}

type HeightAt = (x: number, z: number) => number

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra })

export class ParkView {
  public readonly group = new THREE.Group()

  private readonly grid: PenGrid
  private readonly heightAt: HeightAt
  private readonly pieces = new Map<string, Piece>()
  private readonly unsubscribe: () => void

  private readonly materials = {
    fence: mat(0x8a6a43),
    tall: mat(0x6b5a8c),
    gate: mat(0xe0b341, { emissive: 0x3a2a00 }),
    trough: mat(0x6b4a2b),
    bin: mat(0x4f78a8, { metalness: 0.4, roughness: 0.5 }),
    toy: mat(0xf08a3c),
    shelter: mat(0xb08a5a),
    plant: mat(0x4fa84f),
    roof: mat(0x2c3138, { transparent: true, opacity: 0.55 }),
    pen: new THREE.MeshBasicMaterial({
      color: 0x6fd36f,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  }

  private readonly geometries = {
    fenceX: new THREE.BoxGeometry(CELL, FENCE_H, THICKNESS),
    fenceZ: new THREE.BoxGeometry(THICKNESS, FENCE_H, CELL),
    tallX: new THREE.BoxGeometry(CELL, TALL_FENCE_H, THICKNESS),
    tallZ: new THREE.BoxGeometry(THICKNESS, TALL_FENCE_H, CELL),
    gateX: new THREE.BoxGeometry(CELL, GATE_H, THICKNESS * 1.6),
    gateZ: new THREE.BoxGeometry(THICKNESS * 1.6, GATE_H, CELL),
    trough: new THREE.BoxGeometry(CELL * 0.6, 0.4, CELL * 0.3),
    bin: new THREE.CylinderGeometry(CELL * 0.22, CELL * 0.26, 0.9, 10),
    toy: new THREE.SphereGeometry(CELL * 0.17, 10, 8),
    shelter: new THREE.ConeGeometry(CELL * 0.4, 1.1, 5),
    plant: new THREE.ConeGeometry(CELL * 0.22, 0.9, 6),
    roof: new THREE.BoxGeometry(CELL, 0.12, CELL),
    penCell: new THREE.PlaneGeometry(CELL * 0.98, CELL * 0.98),
  }

  constructor(scene: THREE.Scene, grid: PenGrid, heightAt: HeightAt) {
    this.grid = grid
    this.heightAt = heightAt
    this.group.name = 'ParkView'
    scene.add(this.group)
    this.unsubscribe = grid.onEdit(() => this.sync())
    this.sync()
  }

  /** Number of pieces currently drawn (for tests and debugging). */
  public pieceCount(): number {
    return this.pieces.size
  }

  private sync(): void {
    const wanted = new Map<string, { signature: string; make: () => THREE.Object3D }>()

    for (const fence of this.grid.getFences()) {
      const edge: Edge = { x: fence.x, z: fence.z, axis: fence.axis }
      const kind = fence.gate ? 'gate' : fence.tall ? 'tall' : 'fence'
      wanted.set(`e:${edgeKey(edge)}`, {
        signature: kind,
        make: () => this.makeFence(edge, kind),
      })
    }

    for (const pen of this.grid.getPens()) {
      for (const cell of pen.cells) {
        wanted.set(`pen:${cell.x},${cell.z}`, {
          signature: 'pen',
          make: () => this.makePenCell(cell.x, cell.z),
        })
      }
    }

    const b = this.grid.getBounds()
    for (let z = b.minZ; z <= b.maxZ; z++) {
      for (let x = b.minX; x <= b.maxX; x++) {
        const cell = { x, z }
        if (this.grid.hasRoof(cell)) {
          wanted.set(`r:${x},${z}`, { signature: 'roof', make: () => this.makeRoof(x, z) })
        }
        this.grid.getProps(cell).forEach((kind, i) => {
          wanted.set(`p:${x},${z}:${i}`, {
            signature: kind,
            make: () => this.makeProp(x, z, kind, i),
          })
        })
      }
    }

    for (const [key, piece] of this.pieces) {
      const want = wanted.get(key)
      if (!want || want.signature !== piece.signature) {
        this.group.remove(piece.object)
        this.pieces.delete(key)
      }
    }
    for (const [key, want] of wanted) {
      if (this.pieces.has(key)) continue
      const object = want.make()
      this.group.add(object)
      this.pieces.set(key, { signature: want.signature, object })
    }
  }

  private makeFence(edge: Edge, kind: 'fence' | 'tall' | 'gate'): THREE.Mesh {
    const alongX = edge.axis === 'h'
    const geometry = alongX
      ? kind === 'tall'
        ? this.geometries.tallX
        : kind === 'gate'
          ? this.geometries.gateX
          : this.geometries.fenceX
      : kind === 'tall'
        ? this.geometries.tallZ
        : kind === 'gate'
          ? this.geometries.gateZ
          : this.geometries.fenceZ
    const height = kind === 'tall' ? TALL_FENCE_H : kind === 'gate' ? GATE_H : FENCE_H

    const cx = alongX ? (edge.x + 0.5) * CELL : edge.x * CELL
    const cz = alongX ? edge.z * CELL : (edge.z + 0.5) * CELL
    const mesh = new THREE.Mesh(geometry, this.materials[kind === 'tall' ? 'tall' : kind])
    mesh.position.set(cx, this.heightAt(cx, cz) + height / 2, cz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private makePenCell(x: number, z: number): THREE.Mesh {
    const cx = (x + 0.5) * CELL
    const cz = (z + 0.5) * CELL
    const mesh = new THREE.Mesh(this.geometries.penCell, this.materials.pen)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(cx, this.heightAt(cx, cz) + 0.04, cz)
    mesh.renderOrder = 1
    return mesh
  }

  private makeRoof(x: number, z: number): THREE.Mesh {
    const cx = (x + 0.5) * CELL
    const cz = (z + 0.5) * CELL
    const mesh = new THREE.Mesh(this.geometries.roof, this.materials.roof)
    mesh.position.set(cx, this.heightAt(cx, cz) + ROOF_Y, cz)
    return mesh
  }

  private makeProp(x: number, z: number, kind: PropKind, index: number): THREE.Mesh {
    const cx = (x + 0.5) * CELL
    const cz = (z + 0.5) * CELL
    const y = this.heightAt(cx, cz)
    const mesh = new THREE.Mesh(this.geometries[kind], this.materials[kind])
    const lift: Record<PropKind, number> = {
      trough: 0.2,
      bin: 0.45,
      toy: CELL * 0.17,
      shelter: 0.55,
      plant: 0.45,
    }
    mesh.position.set(cx + index * 0.001, y + lift[kind], cz)
    mesh.castShadow = true
    return mesh
  }

  public dispose(): void {
    this.unsubscribe()
    this.group.removeFromParent()
    this.pieces.clear()
    for (const g of Object.values(this.geometries)) g.dispose()
    for (const m of Object.values(this.materials)) m.dispose()
  }
}
