import { expect, it } from 'vitest'
import { deriveExperiment } from './experimentModels'
import {
  INITIAL_EXPERIMENT_SETTINGS,
  type ExperimentId,
  type ExperimentSettings,
  type Point2,
} from './experiments'

const settings = (overrides: Partial<ExperimentSettings> = {}): ExperimentSettings => ({
  ...INITIAL_EXPERIMENT_SETTINGS,
  ...overrides,
})
const metric = (
  id: ExperimentId,
  label: string,
  overrides: Partial<ExperimentSettings> = {},
  progress = 1,
) =>
  deriveExperiment(id, settings(overrides), progress).metrics.find(
    (value) => value.label === label,
  )!.value

function intersectsInflatedObstacle(
  point: Point2,
  obstacle: { x: number; y: number; width: number; height: number },
) {
  return (
    point[0] >= obstacle.x - 2 &&
    point[0] <= obstacle.x + obstacle.width + 2 &&
    point[1] >= obstacle.y - 2 &&
    point[1] <= obstacle.y + obstacle.height + 2
  )
}

it('plans around a newly added obstacle while a direct reach stops before it', () => {
  const direct = deriveExperiment('planning', settings({ intervention: true }), 1)
  const planned = deriveExperiment('planning', settings({ intervention: true, mode: 'b' }), 1)
  expect(direct.outcome).toBe('blocked')
  expect(intersectsInflatedObstacle(direct.tip, direct.obstacle!)).toBe(false)
  expect(planned.outcome).toBe('success')
  expect(planned.tip).toEqual(planned.target)
  for (let step = 0; step <= 100; step++) {
    const frame = deriveExperiment(
      'planning',
      settings({ intervention: true, mode: 'b' }),
      step / 100,
    )
    expect(intersectsInflatedObstacle(frame.tip, frame.obstacle!)).toBe(false)
  }
  expect(deriveExperiment('planning', settings(), 1).outcome).toBe('success')
})

it('gives a larger soft-arm displacement under the same force and settles after release', () => {
  const soft = Number.parseFloat(metric('compliance', 'Displacement', { intervention: true }))
  const stiff = Number.parseFloat(
    metric('compliance', 'Displacement', { intervention: true, mode: 'b' }),
  )
  expect(soft).toBeGreaterThan(stiff * 3)
  expect(metric('compliance', 'Applied force', { intervention: true })).toBe(
    metric('compliance', 'Applied force', { intervention: true, mode: 'b' }),
  )
  expect(metric('compliance', 'Displacement')).toBe('0.0 units')
  const initial = Number.parseFloat(metric('compliance', 'Displacement', { wasPushed: true }, 0))
  const settled = Number.parseFloat(metric('compliance', 'Displacement', { wasPushed: true }, 1))
  expect(initial).toBeGreaterThan(10)
  expect(settled).toBeLessThan(0.1)
  expect(metric('compliance', 'Displacement', { revision: 2 })).toBe('0.0 units')
})

it('computes an unsafe average from two safe demonstration paths', () => {
  const average = deriveExperiment('averaging', settings(), 1)
  const selected = deriveExperiment('averaging', settings({ mode: 'b' }), 1)
  expect(average.outcome).toBe('blocked')
  expect(selected.outcome).toBe('success')
  expect(selected.tip).toEqual(selected.target)
  for (let index = 0; index < average.path.length; index++) {
    expect(average.path[index][0]).toBe(
      (average.ghostPaths[0][index][0] + average.ghostPaths[1][index][0]) / 2,
    )
    expect(average.path[index][1]).toBe(
      (average.ghostPaths[0][index][1] + average.ghostPaths[1][index][1]) / 2,
    )
  }
  expect(deriveExperiment('averaging', settings({ intervention: true }), 1).outcome).toBe('success')
})

it('releases a partially deflected arm without a position jump', () => {
  const pushed = deriveExperiment('compliance', settings({ intervention: true }), 0.08)
  const offset = pushed.tip[0] - pushed.target[0]
  const released = deriveExperiment(
    'compliance',
    settings({ wasPushed: true, releaseOffset: offset }),
    0,
  )
  expect(released.tip).toEqual(pushed.tip)
  const settled = deriveExperiment(
    'compliance',
    settings({ wasPushed: true, releaseOffset: offset }),
    1,
  )
  expect(Math.abs(settled.tip[0] - settled.target[0])).toBeLessThan(0.1)
})

it('distinguishes maximizing proximity reward from fully containing either cube size', () => {
  for (const intervention of [false, true]) {
    expect(metric('reward', 'Score', { intervention })).toBe('100 / 100')
    expect(metric('reward', 'Cube fully inside', { intervention })).toBe('No')
    expect(metric('reward', 'Score', { intervention, mode: 'b' })).toBe('100 / 100')
    expect(metric('reward', 'Cube fully inside', { intervention, mode: 'b' })).toBe('Yes')
  }
  const normal = deriveExperiment('reward', settings({ mode: 'b' }), 1)
  const larger = deriveExperiment('reward', settings({ mode: 'b', intervention: true }), 1)
  const distance = (a: Point2, b: Point2) => Math.hypot(a[0] - b[0], a[1] - b[1])
  expect(distance(larger.object, larger.target)).toBeLessThan(
    distance(normal.object, normal.target),
  )
})

it('retains a stale estimate under occlusion until a new viewpoint reveals the cube', () => {
  const stale = deriveExperiment('perception', settings({ intervention: true }), 1)
  const beforeLook = deriveExperiment(
    'perception',
    settings({ intervention: true, mode: 'b' }),
    0.2,
  )
  const afterLook = deriveExperiment('perception', settings({ intervention: true, mode: 'b' }), 1)
  expect(stale.outcome).toBe('uncertain')
  expect(stale.tip).not.toEqual(stale.object)
  expect(beforeLook.uncertainty).toBeGreaterThan(0)
  expect(beforeLook.obstacle).not.toBeNull()
  expect(afterLook.estimate).toEqual(afterLook.object)
  expect(afterLook.tip).toEqual(afterLook.object)
  expect(afterLook.uncertainty).toBe(0)
  expect(afterLook.obstacle).toEqual(beforeLook.obstacle)
  expect(afterLook.outcome).toBe('success')
})

it('keeps alternative clear grasps when a preferred side is blocked', () => {
  expect(deriveExperiment('grasps', settings(), 1).outcome).toBe('success')
  const single = deriveExperiment('grasps', settings({ intervention: true }), 1)
  const diverse = deriveExperiment('grasps', settings({ intervention: true, mode: 'b' }), 1)
  expect(single.outcome).toBe('blocked')
  expect(single.grasps!.find((candidate) => candidate.selected)!.valid).toBe(false)
  expect(diverse.outcome).toBe('success')
  expect(diverse.grasps!.find((candidate) => candidate.selected)!.valid).toBe(true)
  expect(diverse.grasps!.filter((candidate) => candidate.valid)).toHaveLength(3)
  const elongated = deriveExperiment(
    'grasps',
    settings({ intervention: true, mode: 'b', amount: 100 }),
    1,
  )
  expect(elongated.grasps!.filter((candidate) => candidate.valid)).toHaveLength(1)
  expect(elongated.grasps!.find((candidate) => candidate.selected)!.valid).toBe(true)
})

it('keeps the blocked grasp outside the obstacle and routes alternatives around it', () => {
  for (const amount of [0, 50, 100]) {
    for (const mode of ['a', 'b'] as const) {
      for (let step = 0; step <= 80; step++) {
        const current = deriveExperiment(
          'grasps',
          settings({ intervention: true, mode, amount }),
          step / 80,
        )
        expect(intersectsInflatedObstacle(current.tip, current.obstacle!)).toBe(false)
      }
    }
  }
})

it('keeps both complete demonstration routes clear of the obstacle', () => {
  const current = deriveExperiment('averaging', settings(), 1)
  for (const route of current.ghostPaths) {
    for (let index = 1; index < route.length; index++) {
      for (let sample = 0; sample <= 50; sample++) {
        const t = sample / 50
        const point: Point2 = [
          route[index - 1][0] + (route[index][0] - route[index - 1][0]) * t,
          route[index - 1][1] + (route[index][1] - route[index - 1][1]) * t,
        ]
        expect(intersectsInflatedObstacle(point, current.obstacle!)).toBe(false)
      }
    }
  }
})

it('clamps playback to finite endpoints for every experiment', () => {
  for (const id of [
    'planning',
    'compliance',
    'averaging',
    'reward',
    'perception',
    'grasps',
  ] as const) {
    for (const progress of [-10, 0, 0.5, 1, 10]) {
      const frame = deriveExperiment(id, settings(), progress)
      expect(frame.tip.every(Number.isFinite)).toBe(true)
      expect(frame.object.every(Number.isFinite)).toBe(true)
    }
  }
})
