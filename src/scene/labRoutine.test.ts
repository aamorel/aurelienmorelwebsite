import { describe, expect, it } from 'vitest'
import { LabRoutine, labPose } from './labRoutine'
import { LIMITS, WELCOME, toolPosition } from './config'
import { LAB_STEPS, LAB_STEP_TIME } from '../lab'
import { ArmMotion } from './motion'

function finish(chunk: number, delay = 400) {
  const routine = new LabRoutine(WELCOME, { chunk, delay, revision: 1 })
  for (let i = 0; i < 2000 && !routine.finished; i++) routine.tick(0.02)
  return routine
}
describe('action chunking experiment', () => {
  it('amortizes blocking inference without changing action duration or task', () => {
    for (const chunk of [1, 6, 12]) {
      const routine = finish(chunk)
      expect(routine.finished).toBe(true)
      expect(routine.snapshot.calls).toBe(Math.ceil(LAB_STEPS / chunk))
      expect(routine.snapshot.elapsed).toBeCloseTo(
        LAB_STEPS * LAB_STEP_TIME + Math.ceil(LAB_STEPS / chunk) * 0.4,
        5,
      )
      expect(routine.snapshot.placedTarget).toBe(0)
    }
  })
  it('observes target changes only when predicting a new chunk', () => {
    const routine = new LabRoutine(WELCOME, { chunk: 6, delay: 400, revision: 1 })
    routine.moveTarget()
    expect(routine.snapshot.target).toBe(1)
    expect(routine.snapshot.observedTarget).toBe(0)
    while (routine.snapshot.step < 6) routine.tick(0.02)
    expect(routine.snapshot.observedTarget).toBe(1)
    while (!routine.finished) routine.tick(0.02)
    expect(routine.snapshot.placedTarget).toBe(1)
  })
  it('does not retroactively change an already queued placement', () => {
    const routine = new LabRoutine(WELCOME, { chunk: 12, delay: 0, revision: 1 })
    while (routine.snapshot.step < 16) routine.tick(0.02)
    routine.moveTarget()
    while (!routine.finished) routine.tick(0.02)
    expect(routine.snapshot.placedTarget).toBe(0)
    expect(routine.snapshot.target).toBe(1)
  })
  it('keeps both authored paths finite, in joint limits and above the desk', () => {
    for (const target of [0, 1])
      for (let step = 0; step <= 24; step += 0.05) {
        const pose = labPose(step, target)
        pose.forEach((value, i) => {
          expect(Number.isFinite(value)).toBe(true)
          expect(value).toBeGreaterThanOrEqual(LIMITS[i][0])
          expect(value).toBeLessThanOrEqual(LIMITS[i][1])
        })
        expect(toolPosition(pose)[1]).toBeGreaterThan(0.08)
      }
  })
  it('suppresses spontaneous routines in the lab and cleans up on navigation', () => {
    const motion = new ArmMotion(() => 0)
    motion.sync({ selected: 'lab', mode: 'reading', revision: 1, motionEnabled: true })
    for (let i = 0; i < 1000; i++) motion.tick(0.05)
    expect(motion.cube).toBeNull()
    motion.startLab({ chunk: 6, delay: 400, revision: 1 })
    expect(motion.phase).toBe('experiment')
    expect(motion.cube).not.toBeNull()
    motion.sync({ selected: null, mode: 'idle', revision: 2, motionEnabled: true })
    expect(motion.labSnapshot).toBeNull()
    expect(motion.cube).toBeNull()
  })
})
