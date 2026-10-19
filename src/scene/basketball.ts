import type { Point } from './config'

// The model and the shot share one target, independent of the camera or drawer.
export const HOOP_CENTER: Point = [-2.95, 1.2, -0.65]
export const HOOP_RADIUS = 0.39
export const RIM_THICKNESS = 0.022
export const SHOT_RELEASE: Point = [-1.35, 1.45, 0.35]
export const SHOT_FLIGHT_TIME = 0.9
export const SHOT_GRAVITY = 8.5
export const HOOP_FACING = Math.atan2(
  SHOT_RELEASE[0] - HOOP_CENTER[0],
  SHOT_RELEASE[2] - HOOP_CENTER[2],
)

// Choose the velocity that carries the cube down through the center of the rim.
export const SHOT_VELOCITY: Point = HOOP_CENTER.map(
  (value, axis) =>
    (value - SHOT_RELEASE[axis]) / SHOT_FLIGHT_TIME +
    (axis === 1 ? (SHOT_GRAVITY * SHOT_FLIGHT_TIME) / 2 : 0),
) as Point
