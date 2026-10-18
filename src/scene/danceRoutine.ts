import { WELCOME, blendPose, smooth, type Pose } from './config'

const READY: Pose = [-0.85, 0.08, -1.1, -1.1, 0, 0.12]
const INTRO = 0.7
const GROOVE = 4.8
const OUTRO = 0.8
export const DANCE_DURATION = INTRO + GROOVE + OUTRO

export class DanceRoutine {
  pose: Pose
  readonly cube = null
  finished = false
  private time = 0
  private start: Pose

  constructor(start: Pose) {
    this.start = [...start]
    this.pose = [...start]
  }

  get elapsed() {
    return this.time
  }

  tick(delta: number): Pose {
    this.time = Math.min(DANCE_DURATION, this.time + Math.max(0, delta))
    if (this.time < INTRO) {
      this.pose = blendPose(this.start, READY, this.time / INTRO)
    } else if (this.time < INTRO + GROOVE) {
      const time = this.time - INTRO
      const beat = (time / 0.6) * Math.PI * 2
      // Sway on alternate beats; nod, twist the wrist and clap the fingers
      // on the quicker beat. Fade the groove in and out without a pose jump.
      const groove: Pose = [
        READY[0] + Math.sin(beat / 2),
        READY[1] - 0.23 * (1 - Math.cos(beat)),
        READY[2] + 0.23 * Math.sin(beat),
        READY[3] - 0.3 * Math.sin(beat),
        0.44 * Math.sin(beat / 2),
        0.105 + 0.045 * (1 - Math.cos(beat)),
      ]
      const envelope = smooth(Math.min(time, GROOVE - time) / 0.4)
      this.pose = READY.map((value, index) => value + (groove[index] - value) * envelope) as Pose
    } else {
      this.pose = blendPose(READY, WELCOME, (this.time - INTRO - GROOVE) / OUTRO)
    }
    this.finished = this.time >= DANCE_DURATION
    if (this.finished) this.pose = [...WELCOME]
    return this.pose
  }
}
