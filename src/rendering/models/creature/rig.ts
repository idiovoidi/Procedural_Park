import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'

/**
 * Lightweight limb animation driven by locomotion. Each limb swings about a
 * creature-space axis on top of its mounting orientation, with a phase set by
 * where it sits so legs alternate (diagonal trot for four, tripod for six).
 */

export type LimbGait = {
  type: Anatomy['limbType']
  /** Row along the body, or index around a ring. */
  row: number
  side: -1 | 0 | 1
}

export type LimbRig = {
  object: THREE.Object3D
  rest: THREE.Quaternion
  axis: THREE.Vector3
  /** +1 or -1; mirrors the swing so left and right limbs move together or oppose as intended. */
  sign: number
  idleAmp: number
  moveAmp: number
  phase: number
}

const AXIS_X = new THREE.Vector3(1, 0, 0)
const AXIS_Z = new THREE.Vector3(0, 0, 1)

const _swing = new THREE.Quaternion()

function isFlier(locomotion: Anatomy['locomotion']): boolean {
  return locomotion === 'fly' || locomotion === 'hover' || locomotion === 'drift'
}

export function createLimbRigs(
  limbs: THREE.Object3D[],
  locomotion: Anatomy['locomotion']
): LimbRig[] {
  return limbs.map((object) => {
    const gait = object.userData.gait as LimbGait
    const rig: LimbRig = {
      object,
      rest: object.quaternion.clone(),
      axis: AXIS_X,
      sign: 1,
      idleAmp: 0.03,
      moveAmp: 0,
      phase: 0,
    }

    switch (gait.type) {
      case 'leg':
        // Fliers and drifters tuck their legs instead of walking
        rig.idleAmp = isFlier(locomotion) ? 0.08 : 0.03
        rig.moveAmp = isFlier(locomotion) ? 0.1 : 0.55
        rig.phase = ((gait.row + (gait.side > 0 ? 1 : 0)) % 2) * Math.PI
        break
      case 'arm':
        // Arms counter-swing against the leg on the same side
        rig.idleAmp = 0.1
        rig.moveAmp = 0.4
        rig.phase = gait.side < 0 ? Math.PI : 0
        break
      case 'fin':
        // Flap about the long axis; mirrored so both fins rise together
        rig.axis = AXIS_Z
        rig.sign = gait.side === 0 ? 1 : gait.side
        rig.idleAmp = 0.12
        rig.moveAmp = 0.35
        rig.phase = gait.row * (Math.PI / 2)
        break
      case 'tendril':
        rig.idleAmp = 0.3
        rig.moveAmp = 0.25
        rig.phase = gait.row * 0.8
        break
      case 'crystal_shard':
        rig.idleAmp = 0.015
        break
    }
    return rig
  })
}

/**
 * @param idleTime seconds, drives the slow idle sway
 * @param gaitPhase radians, advances faster the faster the creature moves
 * @param moveFactor 0 when standing, 1 at full speed
 */
export function updateLimbRigs(
  rigs: LimbRig[],
  idleTime: number,
  gaitPhase: number,
  moveFactor: number
): void {
  for (let i = 0; i < rigs.length; i++) {
    const rig = rigs[i]
    const angle =
      rig.sign *
      (Math.sin(idleTime * 1.3 + i) * rig.idleAmp +
        Math.sin(gaitPhase + rig.phase) * rig.moveAmp * moveFactor)
    _swing.setFromAxisAngle(rig.axis, angle)
    rig.object.quaternion.copy(_swing).multiply(rig.rest)
  }
}
