import { Euler, Quaternion, Vector3 } from 'three'
import {
  ARM,
  SAFE,
  WELCOME,
  blendPose,
  smooth,
  toolPosition,
  type Point,
  type Pose,
} from './config'

export const CUBE_SIZE = 0.22
export const GRIP_CENTER = 0.41
// Inner faces of the fingertip pads sit 0.059 m inside each finger pivot.
export const CUBE_GRIP = CUBE_SIZE / 2 + 0.059
const OPEN_GRIP = 0.21
const WINDUP: Pose = [-1.8, -0.07205, -1.62543, -1.00252, 0, CUBE_GRIP]
const FOLLOW_THROUGH: Pose = [-2.8, -0.57093, -0.76243, -0.36664, 0, CUBE_GRIP]
// Clear spaces between the notebook, papers and prototype, even when selected.
export const CUBE_SPOTS: Point[] = [
  [-0.4, CUBE_SIZE / 2, 1.12],
  [-0.72, CUBE_SIZE / 2, 0.85],
  [0, CUBE_SIZE / 2, 1.38],
  [1.8, CUBE_SIZE / 2, 0.15],
]
export const GRASP_TIME = 2.65
const SWING_START = 4.4
const SWING_DURATION = 0.58
export const RELEASE_TIME = SWING_START + SWING_DURATION * 0.6
export const ROUTINE_DURATION = 6.1
const FLIGHT_DURATION = 1.1
const GRAVITY = 7.5

export type CubeState = {
  phase: 'appearing' | 'waiting' | 'held' | 'flying'
  position: Point
  quaternion: [number, number, number, number]
  scale: number
}

type Keyframe = { at: number; pose: Pose }
const Y_AXIS = new Vector3(0, 1, 0)
const Z_AXIS = new Vector3(0, 0, 1)

// Solve the two arm links for a fingertip position and wrist direction.
// These authored positions are checked against the joint limits in the tests.
function gripPose(position: Point, direction = -Math.PI, gap = OPEN_GRIP): Pose {
  const x = position[0] - ARM.base[0]
  const z = position[2] - ARM.base[2]
  const radius = Math.hypot(x, z) + GRIP_CENTER * Math.sin(direction)
  const height = position[1] - ARM.shoulderHeight - GRIP_CENTER * Math.cos(direction)
  const elbow = -Math.acos(
    (radius ** 2 + height ** 2 - ARM.upper ** 2 - ARM.forearm ** 2) / (2 * ARM.upper * ARM.forearm),
  )
  const shoulder =
    Math.atan2(height, radius) -
    Math.atan2(ARM.forearm * Math.sin(elbow), ARM.upper + ARM.forearm * Math.cos(elbow)) -
    Math.PI / 2
  return [Math.atan2(-z, x), shoulder, elbow, direction - shoulder - elbow, 0, gap]
}

// Same pivot order as the rendered arm. The extra half turn leaves the cube
// upright on the bench when the gripper points straight down.
function heldRotation(pose: Pose): Quaternion {
  return new Quaternion()
    .setFromAxisAngle(Y_AXIS, pose[0])
    .multiply(new Quaternion().setFromAxisAngle(Z_AXIS, pose[1] + pose[2] + pose[3]))
    .multiply(new Quaternion().setFromAxisAngle(Y_AXIS, pose[4]))
    .multiply(new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI))
}

export class CubeRoutine {
  pose: Pose
  cube: CubeState | null = null
  finished = false
  private time = 0
  private keyframes: Keyframe[]
  private releasePosition: Point
  private releaseVelocity: Point
  private releaseRotation: Quaternion
  private restingRotation: [number, number, number, number]

  constructor(
    start: Pose,
    private readonly position: Point = CUBE_SPOTS[0],
  ) {
    this.pose = [...start]
    const pick = gripPose(position)
    this.restingRotation = new Quaternion().setFromAxisAngle(Y_AXIS, pick[0]).toArray()
    const approach = gripPose([position[0], 0.47, position[2]])
    const lift = gripPose(
      [1.55 * Math.cos(pick[0]), 1.1, ARM.base[2] - 1.55 * Math.sin(pick[0])],
      -2.8,
      CUBE_GRIP,
    )
    const notice: Pose = [...SAFE]
    notice[0] = pick[0]
    notice[5] = OPEN_GRIP
    const grasp: Pose = [...pick]
    grasp[5] = CUBE_GRIP
    const follow: Pose = [...FOLLOW_THROUGH]
    follow[5] = OPEN_GRIP
    this.keyframes = [
      { at: 0, pose: start },
      { at: 0.5, pose: start },
      { at: 1.15, pose: notice },
      { at: 1.85, pose: approach },
      { at: 2.35, pose: pick },
      { at: GRASP_TIME, pose: grasp },
      { at: 3.35, pose: lift },
      { at: 3.75, pose: lift },
      { at: SWING_START, pose: WINDUP },
      { at: SWING_START + SWING_DURATION, pose: follow },
      { at: 5.85, pose: WELCOME },
      { at: ROUTINE_DURATION, pose: WELCOME },
    ]
    const release = this.poseAt(RELEASE_TIME)
    this.releasePosition = toolPosition(release, GRIP_CENTER)
    this.releaseRotation = heldRotation(release)
    // Release during the swing, while the hand still has momentum.
    const before = toolPosition(this.poseAt(RELEASE_TIME - 0.001), GRIP_CENTER)
    const after = toolPosition(this.poseAt(RELEASE_TIME + 0.001), GRIP_CENTER)
    this.releaseVelocity = after.map((value, i) => (value - before[i]) / 0.002) as Point
    this.updateCube()
  }

  private poseAt(time: number): Pose {
    const index = this.keyframes.findIndex((frame) => frame.at >= time)
    if (index < 0) return [...WELCOME]
    if (index === 0) return [...this.keyframes[0].pose]
    const from = this.keyframes[index - 1]
    const to = this.keyframes[index]
    const pose = blendPose(from.pose, to.pose, (time - from.at) / (to.at - from.at))
    if (time >= SWING_START && time <= SWING_START + SWING_DURATION) {
      pose[5] = CUBE_GRIP + (OPEN_GRIP - CUBE_GRIP) * smooth((time - RELEASE_TIME) / 0.14)
    }
    return pose
  }

  private updateCube() {
    if (this.time >= RELEASE_TIME + FLIGHT_DURATION) {
      this.cube = null
    } else if (this.time >= RELEASE_TIME) {
      const t = this.time - RELEASE_TIME
      const position = this.releasePosition.map(
        (value, i) => value + this.releaseVelocity[i] * t,
      ) as Point
      position[1] -= 0.5 * GRAVITY * t * t
      const spin = new Quaternion().setFromEuler(new Euler(-3 * t, 4 * t, 5 * t))
      this.cube = {
        phase: 'flying',
        position,
        quaternion: this.releaseRotation.clone().multiply(spin).toArray(),
        scale: 1 - smooth((t - 0.8) / 0.3),
      }
    } else if (this.time >= GRASP_TIME) {
      this.cube = {
        phase: 'held',
        position: toolPosition(this.pose, GRIP_CENTER),
        quaternion: heldRotation(this.pose).toArray(),
        scale: 1,
      }
    } else {
      const scale = smooth(this.time / 0.32)
      this.cube = {
        phase: this.time < 0.32 ? 'appearing' : 'waiting',
        position: [this.position[0], (CUBE_SIZE * scale) / 2, this.position[2]],
        quaternion: [...this.restingRotation],
        scale,
      }
    }
  }

  tick(delta: number): Pose {
    this.time = Math.min(ROUTINE_DURATION, this.time + Math.max(0, delta))
    this.pose = this.poseAt(this.time)
    this.updateCube()
    this.finished = this.time >= ROUTINE_DURATION
    return this.pose
  }
}
