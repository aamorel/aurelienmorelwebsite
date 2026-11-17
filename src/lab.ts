import type { Point } from './scene/config'

export const LAB_STEPS = 24
export const LAB_STEP_TIME = 0.22
export const LAB_PICK: Point = [-0.4, 0.11, 1.12]
export const LAB_TARGETS: Point[] = [
  [0.25, 0.11, 1.12],
  [-0.1, 0.11, 1.45],
]
export type LabRequest = { revision: number; chunk: number; delay: number }
export type LabSnapshot = {
  step: number
  predicted: number
  calls: number
  elapsed: number
  waiting: boolean
  finished: boolean
  target: number
  observedTarget: number
  placedTarget: number | null
}
export const EMPTY_LAB: LabSnapshot = {
  step: 0,
  predicted: 0,
  calls: 0,
  elapsed: 0,
  waiting: false,
  finished: false,
  target: 0,
  observedTarget: 0,
  placedTarget: null,
}
