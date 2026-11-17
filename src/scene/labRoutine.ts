import { WELCOME, blendPose, toolPosition, type Pose } from './config'
import { CUBE_GRIP, GRIP_CENTER, gripPose, heldRotation, type CubeState } from './cubeRoutine'

import {
  EMPTY_LAB,
  LAB_STEPS,
  LAB_STEP_TIME,
  LAB_PICK,
  LAB_TARGETS,
  type LabRequest,
  type LabSnapshot,
} from '../lab'

// Authored joint targets stand in for policy predictions. Each call snapshots the
// target; queued actions cannot see later perturbations until the next call.
export function labPose(step: number, target: number): Pose {
  const destination = LAB_TARGETS[target]
  const frames: [number, Pose][] = [
    [0, WELCOME],
    [4, gripPose([-0.4, 0.55, 1.12])],
    [7, gripPose(LAB_PICK)],
    [9, gripPose(LAB_PICK, -Math.PI, CUBE_GRIP)],
    [12, gripPose([-0.4, 0.65, 1.12], -Math.PI, CUBE_GRIP)],
    [16, gripPose([destination[0], 0.65, destination[2]], -Math.PI, CUBE_GRIP)],
    [19, gripPose(destination, -Math.PI, CUBE_GRIP)],
    [20, gripPose(destination)],
    [22, gripPose([destination[0], 0.65, destination[2]])],
    [24, WELCOME],
  ]
  const index = frames.findIndex(([at]) => at >= step)
  if (index <= 0) return [...frames[0][1]]
  const [a, from] = frames[index - 1],
    [b, to] = frames[index]
  return blendPose(from, to, (step - a) / (b - a))
}

export class LabRoutine {
  pose: Pose
  cube: CubeState | null = null
  finished = false
  snapshot: LabSnapshot = { ...EMPTY_LAB, waiting: true, calls: 1 }
  private queue: Pose[] = []
  private progress = 0
  private wait = 0
  private from: Pose
  constructor(
    start: Pose,
    private options: LabRequest,
  ) {
    this.pose = [...start]
    this.from = [...start]
    this.predict()
    this.updateCube()
  }
  moveTarget() {
    this.snapshot.target = 1 - this.snapshot.target
  }
  private predict() {
    const s = this.snapshot
    s.observedTarget = s.target
    s.predicted = Math.min(LAB_STEPS, s.step + this.options.chunk)
    this.queue = Array.from({ length: s.predicted - s.step }, (_, i) =>
      labPose(s.step + i + 1, s.observedTarget),
    )
    this.wait = this.options.delay / 1000
    s.waiting = this.wait > 0
  }
  private updateCube() {
    const s = this.snapshot
    const held = s.step >= 9 && s.step < 20
    const position = held
      ? toolPosition(this.pose, GRIP_CENTER)
      : s.step >= 20
        ? LAB_TARGETS[s.placedTarget ?? 0]
        : LAB_PICK
    this.cube = {
      phase: held ? 'held' : 'waiting',
      position: [...position],
      quaternion: held ? heldRotation(this.pose).toArray() : [0, 0, 0, 1],
      scale: 1,
    }
  }
  tick(delta: number): Pose {
    if (this.finished) return this.pose
    let remaining = Math.max(0, delta)
    while (remaining > 0 && !this.finished) {
      if (this.wait > 0) {
        const used = Math.min(remaining, this.wait)
        this.wait -= used
        remaining -= used
        this.snapshot.elapsed += used
        this.snapshot.waiting = this.wait > 0
        if (this.wait > 0) break
      }
      const used = Math.min(remaining, LAB_STEP_TIME - this.progress)
      this.progress += used
      remaining -= used
      this.snapshot.elapsed += used
      this.pose = blendPose(this.from, this.queue[0], this.progress / LAB_STEP_TIME)
      if (this.progress >= LAB_STEP_TIME - 1e-9) {
        this.pose = this.queue.shift()!
        this.from = [...this.pose]
        this.progress = 0
        this.snapshot.step++
        if (this.snapshot.step === 20) this.snapshot.placedTarget = this.snapshot.observedTarget
        if (this.snapshot.step === LAB_STEPS) {
          this.finished = true
          this.snapshot.finished = true
        } else if (!this.queue.length) {
          this.snapshot.calls++
          this.predict()
        }
      }
    }
    this.updateCube()
    return this.pose
  }
}
