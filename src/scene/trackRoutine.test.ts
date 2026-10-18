import { describe, expect, it } from 'vitest'
import { ARM, IDLE_POSES, LIMITS, WELCOME, toolPosition, type Point } from './config'
import {
  TRACK_DURATION,
  TRACK_HEIGHT,
  TRACK_RETURN,
  TrackRoutine,
  trackingPose,
} from './trackRoutine'

const targets: Point[] = [
  [1.2, TRACK_HEIGHT, 0.2],
  [-1.3, TRACK_HEIGHT, 0.3],
  [8, 0, -8],
  [-8, 0, -8],
  [0, 0, ARM.base[2]],
]

describe('mouse tracking', () => {
  it('puts the end effector at reachable cursor positions with the gripper facing down', () => {
    const target = targets[0]
    const pose = trackingPose(target)
    toolPosition(pose).forEach((value, axis) => expect(value).toBeCloseTo(target[axis], 8))
    expect(pose[1] + pose[2] + pose[3]).toBeCloseTo(-Math.PI, 8)
  })

  it('clamps every direction to the reachable arc without violating joint limits', () => {
    for (let x = -5; x <= 5; x += 0.25) {
      for (let z = -5; z <= 5; z += 0.25) {
        const pose = trackingPose([x, 0, z])
        pose.forEach((angle, index) => {
          expect(Number.isFinite(angle)).toBe(true)
          expect(angle).toBeGreaterThanOrEqual(LIMITS[index][0])
          expect(angle).toBeLessThanOrEqual(LIMITS[index][1])
        })
        expect(toolPosition(pose)[1]).toBeCloseTo(TRACK_HEIGHT, 8)
      }
    }
  })

  it.each(IDLE_POSES)(
    'smoothly follows changing targets and keeps the hand above the objects from %s',
    (...start) => {
      const routine = new TrackRoutine(start)
      for (const target of targets) {
        const previous = [...routine.pose]
        routine.setTarget(target)
        expect(routine.pose).toEqual(previous)
        for (let frame = 0; frame < 90; frame++) {
          routine.tick(1 / 60)
          expect(toolPosition(routine.pose)[1]).toBeGreaterThan(1.05)
          expect(toolPosition(routine.pose, 0)[1]).toBeGreaterThan(1.1)
        }
        toolPosition(routine.pose).forEach((value, axis) =>
          expect(value).toBeCloseTo(routine.target![axis], 4),
        )
      }
    },
  )

  it('tracks for ten seconds, ignores new targets after that, and returns home smoothly', () => {
    const routine = new TrackRoutine(WELCOME)
    routine.setTarget(targets[1])
    routine.tick(TRACK_DURATION - 0.01)
    expect(routine.secondsRemaining).toBe(1)
    const beforeReturn = [...routine.pose]
    routine.tick(0.01)
    expect(routine.secondsRemaining).toBe(0)
    expect(routine.finished).toBe(false)
    expect(routine.target).toBeNull()
    routine.pose.forEach((angle, i) => expect(angle).toBeCloseTo(beforeReturn[i], 6))
    routine.setTarget(targets[0])
    expect(routine.target).toBeNull()
    routine.tick(TRACK_RETURN)
    expect(routine.finished).toBe(true)
    expect(routine.pose).toEqual(WELCOME)
  })

  it('holds safely without pointer input and ignores invalid coordinates', () => {
    const routine = new TrackRoutine(WELCOME)
    routine.setTarget([NaN, 0, 0])
    routine.tick(2)
    expect(routine.pose).toEqual(WELCOME)
    expect(routine.target).toBeNull()
  })

  it('follows at the same speed at different frame rates and can stop early', () => {
    const slow = new TrackRoutine(WELCOME)
    const fast = new TrackRoutine(WELCOME)
    slow.setTarget(targets[0])
    fast.setTarget(targets[0])
    for (let i = 0; i < 30; i++) slow.tick(1 / 30)
    for (let i = 0; i < 120; i++) fast.tick(1 / 120)
    slow.pose.forEach((value, axis) => expect(value).toBeCloseTo(fast.pose[axis], 8))
    const previous = [...slow.pose]
    slow.stop()
    expect(slow.pose).toEqual(previous)
    expect(slow.secondsRemaining).toBe(0)
    slow.tick(TRACK_RETURN)
    expect(slow.pose).toEqual(WELCOME)
  })
})
