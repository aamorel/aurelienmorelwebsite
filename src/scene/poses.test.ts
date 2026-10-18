import { describe, expect, it } from 'vitest'
import {
  IDLE_POSES,
  LIMITS,
  SAFE,
  TARGETS,
  WELCOME,
  blendPose,
  toolPosition,
  type Pose,
} from './config'

describe('authored arm geometry and motion', () => {
  it('reaches the notebook, prototype, and papers with the defined link lengths', () => {
    const heights = { education: 0.22, work: 0.64, publications: 0.12 }
    for (const [name, target] of Object.entries(TARGETS)) {
      const tool = toolPosition(target.touch)
      expect(tool[0]).toBeCloseTo(target.position[0], 3)
      expect(tool[2]).toBeCloseTo(target.position[2], 3)
      expect(tool[1]).toBeCloseTo(heights[name as keyof typeof heights], 3)
      expect(toolPosition(target.approach)[1]).toBeGreaterThan(tool[1] + 0.27)
    }
  })

  it('keeps every authored joint pose inside its limits', () => {
    const poses = [
      SAFE,
      ...IDLE_POSES,
      ...Object.values(TARGETS).flatMap((target) => [target.approach, target.touch, target.safe]),
    ]
    for (const pose of poses)
      pose.forEach((value, i) => {
        expect(value).toBeGreaterThanOrEqual(LIMITS[i][0])
        expect(value).toBeLessThanOrEqual(LIMITS[i][1])
      })
  })

  it('keeps the tool above the desk on reaches and interrupted transitions', () => {
    const sources = [
      WELCOME,
      ...Object.values(TARGETS).flatMap((target) =>
        Array.from({ length: 11 }, (_, i) => blendPose(target.approach, target.touch, i / 10)),
      ),
    ]
    for (const source of sources)
      for (const target of Object.values(TARGETS)) {
        const retract: Pose = [...target.safe]
        retract[0] = source[0]
        const waypoints = [source, retract, target.approach, target.touch]
        for (let segment = 0; segment < waypoints.length - 1; segment++)
          for (let sample = 0; sample <= 20; sample++) {
            const pose = blendPose(waypoints[segment], waypoints[segment + 1], sample / 20)
            expect(toolPosition(pose)[1]).toBeGreaterThan(0.08)
          }
      }
  })
})
