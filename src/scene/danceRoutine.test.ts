import { describe, expect, it } from 'vitest'
import { IDLE_POSES, LIMITS, WELCOME, toolPosition } from './config'
import { DANCE_DURATION, DanceRoutine } from './danceRoutine'

describe('dance choreography', () => {
  it.each(IDLE_POSES.map((pose, index) => ({ pose, index })))(
    'starts smoothly from idle pose $index, stays above the objects, and returns home',
    ({ pose }) => {
      const dance = new DanceRoutine(pose)
      expect(dance.pose).toEqual(pose)
      const yaw: number[] = []
      const heights: number[] = []
      for (let frame = 0; frame < 640; frame++) {
        dance.tick(0.01)
        dance.pose.forEach((value, index) => {
          expect(value).toBeGreaterThanOrEqual(LIMITS[index][0])
          expect(value).toBeLessThanOrEqual(LIMITS[index][1])
        })
        // The wrist and fingertips clear even the open book and raised prototype.
        expect(toolPosition(dance.pose, 0)[1]).toBeGreaterThan(1.1)
        expect(toolPosition(dance.pose, 0.45)[1]).toBeGreaterThan(1.1)
        expect(dance.cube).toBeNull()
        yaw.push(dance.pose[0])
        heights.push(toolPosition(dance.pose)[1])
      }
      expect(Math.max(...yaw) - Math.min(...yaw)).toBeGreaterThan(1.8)
      expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.5)
      expect(dance.finished).toBe(true)
      expect(dance.pose).toEqual(WELCOME)
    },
  )

  it('keeps entry and exit continuous and produces the same poses at different frame rates', () => {
    for (const time of [0.7, 1.31, 3.8, 5.5, DANCE_DURATION]) {
      const expected = new DanceRoutine(WELCOME)
      expected.tick(time)
      const before = new DanceRoutine(WELCOME)
      before.tick(time - 0.001)
      expect(
        Math.max(...before.pose.map((value, i) => Math.abs(value - expected.pose[i]))),
      ).toBeLessThan(0.01)
      for (const fps of [30, 60, 120]) {
        const actual = new DanceRoutine(WELCOME)
        let elapsed = 0
        while (elapsed < time) {
          const delta = Math.min(1 / fps, time - elapsed)
          actual.tick(delta)
          elapsed += delta
        }
        actual.pose.forEach((value, i) => expect(value).toBeCloseTo(expected.pose[i], 7))
      }
    }
  })
})
