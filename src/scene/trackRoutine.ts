import { ARM, LIMITS, WELCOME, blendPose, toolPosition, type Point, type Pose } from './config'

export const TRACK_DURATION = 10
export const TRACK_RETURN = 0.9
export const TRACK_HEIGHT = 1.15

// Keep the hand above the desk objects and inside a reachable horizontal arc.
export function trackingPose(point: Point): Pose {
  const x = point[0] - ARM.base[0]
  const z = point[2] - ARM.base[2]
  const radius = Math.min(1.78, Math.max(0.85, Math.hypot(x, z)))
  let yaw = Math.atan2(-z, x)
  const [minYaw, maxYaw] = LIMITS[0]
  if (yaw > maxYaw) {
    yaw = yaw - maxYaw < Math.PI * 2 + minYaw - yaw ? maxYaw : minYaw
  }
  yaw = Math.max(minYaw, yaw)
  const height = TRACK_HEIGHT + ARM.tool - ARM.shoulderHeight
  const elbow = -Math.acos(
    (radius ** 2 + height ** 2 - ARM.upper ** 2 - ARM.forearm ** 2) / (2 * ARM.upper * ARM.forearm),
  )
  const shoulder =
    Math.atan2(height, radius) -
    Math.atan2(ARM.forearm * Math.sin(elbow), ARM.upper + ARM.forearm * Math.cos(elbow)) -
    Math.PI / 2
  return [yaw, shoulder, elbow, -Math.PI - shoulder - elbow, 0, 0.13]
}

export class TrackRoutine {
  pose: Pose
  readonly cube = null
  target: Point | null = null
  finished = false
  private time = 0
  private targetPose: Pose
  private returnStart: Pose | null = null

  constructor(start: Pose) {
    this.pose = [...start]
    this.targetPose = [...start]
  }

  get secondsRemaining() {
    return Math.max(0, Math.ceil(TRACK_DURATION - this.time))
  }

  setTarget(point: Point) {
    if (this.time >= TRACK_DURATION || !point.every(Number.isFinite)) return
    this.targetPose = trackingPose(point)
    this.target = toolPosition(this.targetPose)
  }

  stop() {
    if (this.time >= TRACK_DURATION) return
    this.returnStart = [...this.pose]
    this.time = TRACK_DURATION
    this.target = null
  }

  tick(delta: number): Pose {
    const previous = this.time
    this.time = Math.min(TRACK_DURATION + TRACK_RETURN, previous + Math.max(0, delta))
    if (previous < TRACK_DURATION) {
      const trackingDelta = Math.min(this.time, TRACK_DURATION) - previous
      const follow = 1 - Math.exp(-9 * trackingDelta)
      this.pose = this.pose.map((value, i) => value + (this.targetPose[i] - value) * follow) as Pose
    }
    if (this.time >= TRACK_DURATION) {
      this.returnStart ??= [...this.pose]
      this.target = null
      this.pose = blendPose(this.returnStart, WELCOME, (this.time - TRACK_DURATION) / TRACK_RETURN)
    }
    this.finished = this.time >= TRACK_DURATION + TRACK_RETURN
    if (this.finished) this.pose = [...WELCOME]
    return this.pose
  }
}
