import type { Section } from '../content'
import type { Mode } from '../useNavigation'
import { IDLE_POSES, SAFE, TARGETS, WELCOME, blendPose, type Point, type Pose } from './config'
import { CUBE_SPOTS, CubeRoutine, type CubeState } from './cubeRoutine'
import { DanceRoutine } from './danceRoutine'
import { TrackRoutine } from './trackRoutine'

export type ArmPhase = 'idle' | 'reaching' | 'returning' | 'playing' | 'dancing' | 'tracking'
export type Behavior = 'cube' | 'dance' | 'track'
export type BehaviorRequest = { kind: Behavior; revision: number }
type Step = { to: Pose; duration: number; phase: ArmPhase }
type Request = { selected: Section | null; revision: number; mode: Mode; motionEnabled: boolean }

// The arm's gesture has its own lifetime. Opening content must neither freeze
// it at the target nor replay the reach when motion is resumed.
export class ArmMotion {
  pose: Pose = [...WELCOME]
  phase: ArmPhase = 'idle'
  cube: CubeState | null = null
  private request: Request | null = null
  private steps: Step[] = []
  private start: Pose = [...WELCOME]
  private elapsed = 0
  private idleTime = 0
  private idleIndex = 0
  private routine: CubeRoutine | DanceRoutine | TrackRoutine | null = null
  private playTime = 0
  private nextPlay = 0
  private lastSpot = -1
  private random: () => number

  constructor(random: () => number = Math.random) {
    this.random = random
    this.nextPlay = 9 + random() * 5
  }

  get danceTime() {
    return this.routine instanceof DanceRoutine ? this.routine.elapsed : null
  }
  get basketTime() {
    return this.routine instanceof CubeRoutine ? this.routine.timeSinceScore : null
  }
  get trackingSeconds() {
    return this.routine instanceof TrackRoutine ? this.routine.secondsRemaining : 0
  }
  get trackingTarget() {
    return this.routine instanceof TrackRoutine ? this.routine.target : null
  }

  setTrackTarget(point: Point) {
    if (this.routine instanceof TrackRoutine) this.routine.setTarget(point)
  }

  stopTracking() {
    if (this.routine instanceof TrackRoutine) {
      this.routine.stop()
      this.phase = 'returning'
    }
  }

  startBehavior(kind: Behavior): boolean {
    if (!this.request?.motionEnabled || this.phase !== 'idle' || this.request.mode === 'reaching')
      return false
    if (kind === 'cube') {
      // Choose a different spot each time, for both spontaneous and manual play.
      const choices = CUBE_SPOTS.map((_, index) => index).filter((index) => index !== this.lastSpot)
      this.lastSpot = choices[Math.floor(this.random() * choices.length)]
      this.routine = new CubeRoutine(this.pose, CUBE_SPOTS[this.lastSpot])
    } else if (kind === 'dance') {
      this.routine = new DanceRoutine(this.pose)
    } else {
      this.routine = new TrackRoutine(this.pose)
    }
    this.steps = []
    this.elapsed = 0
    this.cube = this.routine.cube
    this.phase = kind === 'cube' ? 'playing' : kind === 'dance' ? 'dancing' : 'tracking'
    return true
  }

  sync(request: Request) {
    const previous = this.request
    this.request = request
    if (
      previous &&
      previous.selected === request.selected &&
      previous.revision === request.revision &&
      previous.motionEnabled === request.motionEnabled
    )
      return

    this.steps = []
    this.start = [...this.pose]
    this.elapsed = 0
    this.idleTime = 0
    this.routine = null
    this.cube = null
    this.playTime = 0

    if (!request.motionEnabled) {
      this.pose = [...WELCOME]
      this.phase = 'idle'
      return
    }

    if (request.selected && request.mode === 'reaching') {
      const target = TARGETS[request.selected]
      const retract: Pose = [...target.safe]
      retract[0] = this.pose[0]
      const returnPose: Pose = [...target.safe]
      returnPose[0] = target.touch[0]
      this.steps = [
        { to: retract, duration: 0.19, phase: 'reaching' },
        { to: target.approach, duration: 0.29, phase: 'reaching' },
        { to: target.touch, duration: 0.22, phase: 'reaching' },
        { to: target.touch, duration: 0.18, phase: 'reaching' },
        { to: returnPose, duration: 0.4, phase: 'returning' },
        { to: WELCOME, duration: 0.65, phase: 'returning' },
      ]
    } else if (this.pose.some((value, index) => Math.abs(value - WELCOME[index]) > 0.001)) {
      const retract: Pose = [...SAFE]
      retract[0] = this.pose[0]
      this.steps = [
        { to: retract, duration: 0.4, phase: 'returning' },
        { to: WELCOME, duration: 0.65, phase: 'returning' },
      ]
    }
    this.phase = this.steps[0]?.phase ?? 'idle'
  }

  tick(rawDelta: number): Pose {
    if (!this.request?.motionEnabled) return this.pose
    // Avoid jumping through a gesture when a hidden/offscreen scene resumes.
    let delta = Math.min(Math.max(rawDelta, 0), 0.06)
    if (this.routine) {
      this.pose = this.routine.tick(delta)
      this.cube = this.routine.cube
      if (this.routine instanceof TrackRoutine && this.routine.secondsRemaining === 0) {
        this.phase = 'returning'
      }
      if (this.routine.finished) {
        this.routine = null
        this.cube = null
        this.phase = 'idle'
        this.start = [...this.pose]
        this.idleTime = 0
        this.playTime = 0
        this.nextPlay = 18 + this.random() * 16
      }
      return this.pose
    }

    if (this.phase === 'idle' && this.request.mode !== 'reaching') {
      this.playTime += delta
      if (this.playTime >= this.nextPlay) {
        this.startBehavior(this.random() < 0.5 ? 'cube' : 'dance')
        return this.pose
      }
    }

    while (delta > 0) {
      const step = this.steps[0]
      if (!step) {
        const pause = 3.5 + (this.idleIndex % 3)
        const advance = Math.min(delta, Math.max(0, pause - this.idleTime))
        this.idleTime += advance
        delta -= advance
        if (this.idleTime >= pause) {
          this.idleTime = 0
          this.idleIndex = (this.idleIndex + 1) % IDLE_POSES.length
          this.start = [...this.pose]
          this.steps = [{ to: IDLE_POSES[this.idleIndex], duration: 2.2, phase: 'idle' }]
        }
        continue
      }

      const advance = Math.min(delta, step.duration - this.elapsed)
      this.elapsed += advance
      delta -= advance
      this.pose = blendPose(this.start, step.to, this.elapsed / step.duration)
      if (this.elapsed >= step.duration) {
        this.pose = [...step.to]
        this.steps.shift()
        this.start = [...this.pose]
        this.elapsed = 0
        this.phase = this.steps[0]?.phase ?? 'idle'
      }
    }
    return this.pose
  }
}
