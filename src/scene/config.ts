import type { Section } from '../content'

// Radians: base Y, shoulder Z, elbow Z, wrist Z, tool roll Y, finger gap.
// Links extend along local +Y. The tool center is 0.4 m from the wrist.
export type Pose = [number, number, number, number, number, number]
export type Point = [number, number, number]
export const ARM = {
  base: [0, 0, -0.6] as Point,
  shoulderHeight: 0.5,
  upper: 1.15,
  forearm: 1,
  tool: 0.4,
}
export const LIMITS: [number, number][] = [
  [-2.8, 0.7],
  [-1.3, 0.6],
  [-2, -0.4],
  [-1.9, -0.35],
  [-0.5, 0.5],
  [0.06, 0.22],
]
export const WELCOME: Pose = [-0.12, 0.32, -1.8, -0.55, 0.12, 0.13]
export const SAFE: Pose = [-0.7, 0.05, -0.6, -1.8, 0, 0.13]
export const IDLE_POSES: Pose[] = [
  WELCOME,
  [-0.35, 0.2, -1.7, -0.62, -0.12, 0.1],
  [0.08, 0.28, -1.68, -0.72, 0.18, 0.14],
  [-0.12, 0.32, -1.8, -0.55, 0, 0.1],
]

export const TARGETS: Record<
  Section,
  { position: Point; label: Point; rotation: number; approach: Pose; touch: Pose; safe: Pose }
> = {
  education: {
    position: [-1.5, 0, 0.7],
    label: [-1.7, 0.03, 1.38],
    rotation: -0.15,
    approach: [-2.4275, -1.0532, -0.6875, -1.4009, 0, 0.13],
    touch: [-2.4275, -1.1482, -0.782, -1.2114, 0, 0.09],
    safe: [...SAFE],
  },
  work: {
    position: [1.43, 0, -0.65],
    label: [1.85, 0.05, -0.13],
    rotation: 0.2,
    approach: [0.035, -0.4103, -1.3972, -1.3341, 0, 0.13],
    touch: [0.035, -0.4973, -1.5636, -1.0807, 0, 0.09],
    safe: [...SAFE],
  },
  publications: {
    position: [0.85, 0, 1],
    label: [0.85, 0.02, 1.64],
    rotation: 0.12,
    approach: [-1.0825, -0.9009, -1.0967, -1.1439, 0, 0.13],
    touch: [-1.0825, -1.0344, -1.14, -0.9671, 0, 0.09],
    safe: [...SAFE],
  },
}

export const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}
export function blendPose(from: Pose, to: Pose, t: number): Pose {
  return from.map((value, index) =>
    Math.min(LIMITS[index][1], Math.max(LIMITS[index][0], value + (to[index] - value) * smooth(t))),
  ) as Pose
}

// Forward kinematics are also used by tests to catch mismatched pivots or poses.
export function toolPosition(pose: Pose, toolLength = ARM.tool): Point {
  const [yaw, shoulder, elbow, wrist] = pose
  const reach =
    -ARM.upper * Math.sin(shoulder) -
    ARM.forearm * Math.sin(shoulder + elbow) -
    toolLength * Math.sin(shoulder + elbow + wrist)
  return [
    ARM.base[0] + reach * Math.cos(yaw),
    ARM.shoulderHeight +
      ARM.upper * Math.cos(shoulder) +
      ARM.forearm * Math.cos(shoulder + elbow) +
      toolLength * Math.cos(shoulder + elbow + wrist),
    ARM.base[2] - reach * Math.sin(yaw),
  ]
}
