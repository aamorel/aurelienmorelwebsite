import { describe, expect, it } from 'vitest'
import { Box3, Quaternion, Vector3 } from 'three'
import { LIMITS, WELCOME, toolPosition } from './config'
import {
  CUBE_SPOTS,
  CUBE_SIZE,
  GRASP_TIME,
  GRIP_CENTER,
  RELEASE_TIME,
  ROUTINE_DURATION,
  CubeRoutine,
} from './cubeRoutine'

// Conservative bounds include the raised papers, open book cover and lit gimbal.
const deskObjects = [
  new Box3(new Vector3(-2.05, 0, 0.1), new Vector3(-0.98, 0.22, 1.32)),
  new Box3(new Vector3(-2.45, 0.2, 0.1), new Vector3(-1.7, 0.95, 1.32)),
  new Box3(new Vector3(0.9, 0, -1.16), new Vector3(1.96, 0.82, -0.14)),
  new Box3(new Vector3(0.25, 0, 0.54), new Vector3(1.45, 0.52, 1.46)),
]

describe.each(CUBE_SPOTS.map((position, index) => ({ position, index })))(
  'cube pickup and throw at spot $index',
  ({ position }) => {
    const at = (time: number) => {
      const routine = new CubeRoutine(WELCOME, position)
      routine.tick(time)
      return routine
    }

    it('closes the fingertips around the cube before lifting it', () => {
      const before = at(GRASP_TIME - 0.3)
      const grasp = at(GRASP_TIME)
      expect(before.cube?.phase).toBe('waiting')
      expect(grasp.cube?.phase).toBe('held')
      expect(grasp.pose[5]).toBeLessThan(before.pose[5])
      grasp.cube!.position.forEach((value, i) => expect(value).toBeCloseTo(position[i], 4))

      // The inner pad faces meet the two opposite cube faces, leaving the palm clear.
      expect(grasp.pose[5] - 0.059).toBeCloseTo(CUBE_SIZE / 2)
      expect(GRIP_CENTER - CUBE_SIZE / 2).toBeGreaterThan(0.29)
      const lifted = at(3.35)
      expect(lifted.cube?.phase).toBe('held')
      expect(lifted.cube!.position[1]).toBeGreaterThan(1)
      expect(lifted.cube!.position).toEqual(toolPosition(lifted.pose, GRIP_CENTER))
    })

    it('releases without a position or velocity jump and opens the gripper', () => {
      const dt = 0.001
      const before = at(RELEASE_TIME - dt)
      const release = at(RELEASE_TIME)
      const after = at(RELEASE_TIME + dt)
      expect(before.cube?.phase).toBe('held')
      expect(release.cube?.phase).toBe('flying')
      for (let axis = 0; axis < 3; axis++) {
        const incoming = (release.cube!.position[axis] - before.cube!.position[axis]) / dt
        const outgoing = (after.cube!.position[axis] - release.cube!.position[axis]) / dt
        expect(Math.abs(incoming - outgoing)).toBeLessThan(0.15)
      }
      expect(at(RELEASE_TIME + 0.16).pose[5]).toBeGreaterThan(release.pose[5])
      expect(
        new Quaternion()
          .fromArray(before.cube!.quaternion)
          .angleTo(new Quaternion().fromArray(release.cube!.quaternion)),
      ).toBeLessThan(0.02)
    })

    it('keeps the cube and tool clear of the desk, then sends the cube past its edge', () => {
      const routine = new CubeRoutine(WELCOME, position)
      let crossedEdge = false
      for (let frame = 0; frame < 610; frame++) {
        routine.tick(0.01)
        routine.pose.forEach((value, i) => {
          expect(value).toBeGreaterThanOrEqual(LIMITS[i][0])
          expect(value).toBeLessThanOrEqual(LIMITS[i][1])
        })
        expect(toolPosition(routine.pose)[1]).toBeGreaterThan(0.08)
        const cube = routine.cube
        if (!cube) continue
        if (cube.position[0] < -2.5 - CUBE_SIZE) crossedEdge = true
        if (cube.phase === 'flying' && crossedEdge) continue
        const rotation = new Quaternion().fromArray(cube.quaternion)
        const bounds = new Box3()
        for (const x of [-1, 1])
          for (const y of [-1, 1])
            for (const z of [-1, 1]) {
              const corner = new Vector3(x, y, z)
                .multiplyScalar((CUBE_SIZE * cube.scale) / 2)
                .applyQuaternion(rotation)
                .add(new Vector3(...cube.position))
              expect(corner.y).toBeGreaterThan(-0.002)
              bounds.expandByPoint(corner)
            }
        deskObjects.forEach((object) => expect(bounds.intersectsBox(object)).toBe(false))
      }
      expect(crossedEdge).toBe(true)
      routine.tick(0.01)
      expect(routine.finished).toBe(true)
      expect(routine.cube).toBeNull()
      expect(routine.pose).toEqual(WELCOME)
    })

    it('has the same pickup, release and finish at different frame rates', () => {
      for (const time of [GRASP_TIME, RELEASE_TIME + 0.2, ROUTINE_DURATION]) {
        const expected = at(time)
        for (const fps of [30, 60, 120]) {
          const actual = new CubeRoutine(WELCOME, position)
          let elapsed = 0
          while (elapsed < time) {
            const delta = Math.min(1 / fps, time - elapsed)
            actual.tick(delta)
            elapsed += delta
          }
          expect(actual.cube?.phase).toBe(expected.cube?.phase)
          actual.pose.forEach((value, i) => expect(value).toBeCloseTo(expected.pose[i], 7))
          actual.cube?.position.forEach((value, i) =>
            expect(value).toBeCloseTo(expected.cube!.position[i], 7),
          )
        }
      }
    })
  },
)
