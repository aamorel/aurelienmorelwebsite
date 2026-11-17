import type { ExperimentFrame, ExperimentId, ExperimentSettings, Point2 } from './experiments'

type Obstacle = NonNullable<ExperimentFrame['obstacle']>
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const distance = (a: Point2, b: Point2) => Math.hypot(a[0] - b[0], a[1] - b[1])
const mix = (a: Point2, b: Point2, t: number): Point2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]
const pathLength = (path: Point2[]) =>
  path.slice(1).reduce((total, point, index) => total + distance(path[index], point), 0)

function onPath(path: Point2[], progress: number): Point2 {
  let remaining = pathLength(path) * clamp(progress)
  for (let index = 1; index < path.length; index++) {
    const length = distance(path[index - 1], path[index])
    if (remaining <= length)
      return mix(path[index - 1], path[index], length ? remaining / length : 0)
    remaining -= length
  }
  return [...path[path.length - 1]]
}

function inside(point: Point2, obstacle: Obstacle, clearance = 2) {
  return (
    point[0] >= obstacle.x - clearance &&
    point[0] <= obstacle.x + obstacle.width + clearance &&
    point[1] >= obstacle.y - clearance &&
    point[1] <= obstacle.y + obstacle.height + clearance
  )
}

function collisionProgress(path: Point2[], obstacle: Obstacle | null) {
  if (!obstacle) return 1
  const samples = Math.ceil(pathLength(path) * 4)
  for (let index = 0; index <= samples; index++) {
    if (inside(onPath(path, index / samples), obstacle)) return Math.max(0, (index - 1) / samples)
  }
  return 1
}

// A* on a two-unit tabletop grid. Inflate the obstacle by the cube footprint.
function planRoute(start: Point2, target: Point2, obstacle: Obstacle | null): Point2[] {
  if (!obstacle) return [start, target]
  const key = (point: Point2) => point.join(',')
  const open: Point2[] = [start]
  const costs = new Map([[key(start), 0]])
  const previous = new Map<string, Point2>()
  const closed = new Set<string>()
  while (open.length) {
    open.sort(
      (a, b) => costs.get(key(a))! + distance(a, target) - costs.get(key(b))! - distance(b, target),
    )
    const current = open.shift()!
    const currentKey = key(current)
    if (closed.has(currentKey)) continue
    if (distance(current, target) < 1) {
      const path: Point2[] = [target]
      let cursor = current
      while (previous.has(key(cursor))) {
        cursor = previous.get(key(cursor))!
        path.unshift(cursor)
      }
      // Remove collinear grid points, preserving the same collision-free route.
      return path.filter(
        (point, index) =>
          index === 0 ||
          index === path.length - 1 ||
          (point[0] - path[index - 1][0]) * (path[index + 1][1] - point[1]) !==
            (point[1] - path[index - 1][1]) * (path[index + 1][0] - point[0]),
      )
    }
    closed.add(currentKey)
    for (const [dx, dy] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const next: Point2 = [current[0] + dx, current[1] + dy]
      if (next[0] < 18 || next[0] > 88 || next[1] < 8 || next[1] > 60 || inside(next, obstacle, 3))
        continue
      const nextCost = costs.get(currentKey)! + 2
      if (nextCost >= (costs.get(key(next)) ?? Infinity)) continue
      costs.set(key(next), nextCost)
      previous.set(key(next), current)
      open.push(next)
    }
  }
  return [start]
}

function frame(
  path: Point2[],
  target: Point2,
  progress: number,
  obstacle: Obstacle | null = null,
): ExperimentFrame {
  const collision = collisionProgress(path, obstacle)
  const blocked = collision < 1 && progress >= collision
  const tip = onPath(path, Math.min(progress, collision))
  return {
    path,
    ghostPaths: [],
    tip,
    object: tip,
    target,
    obstacle,
    status: blocked
      ? 'The cube reached the obstacle. The direct move cannot continue.'
      : progress >= 1
        ? 'The cube reached the ring.'
        : 'Moving toward the ring…',
    outcome: blocked ? 'blocked' : progress >= 1 ? 'success' : 'running',
    metrics: [
      { label: 'Distance to ring', value: `${distance(tip, target).toFixed(1)} units` },
      { label: 'Route length', value: `${pathLength(path).toFixed(1)} units` },
    ],
  }
}

const planningStart: Point2 = [24, 44]
const planningTarget: Point2 = [78, 24]
const planningObstacle = { x: 45, y: 22, width: 12, height: 25 }
const plannedRoute = planRoute(planningStart, planningTarget, planningObstacle)
function planning(settings: ExperimentSettings, progress: number) {
  const start = planningStart,
    target = planningTarget
  const obstacle = settings.intervention ? planningObstacle : null
  const direct = [start, target]
  const planned = obstacle ? plannedRoute : direct
  const result = frame(settings.mode === 'a' ? direct : planned, target, progress, obstacle)
  result.ghostPaths = [settings.mode === 'a' ? planned : direct]
  if (result.outcome === 'success')
    result.status = obstacle
      ? 'The planned route clears the obstacle and reaches the ring.'
      : 'With no obstacle, the direct route works.'
  return result
}

function compliance(settings: ExperimentSettings, progress: number): ExperimentFrame {
  const target: Point2 = [58, 32]
  const stiffness = settings.mode === 'a' ? 1 : 4
  const force = 5 + clamp(settings.amount / 100) * 15
  // Critically damped step response; releasing preserves the displayed offset.
  const t = progress * 6,
    omega = Math.sqrt(stiffness) * 1.4
  const decay = (1 + omega * t) * Math.exp(-omega * t)
  const displacement = settings.intervention
    ? (force / stiffness) * (1 - decay)
    : settings.wasPushed
      ? (settings.releaseOffset ?? force / stiffness) * decay
      : 0
  const tip: Point2 = [target[0] + displacement, target[1]]
  return {
    path: [target, tip],
    ghostPaths: [],
    tip,
    object: tip,
    target,
    obstacle: null,
    force: settings.intervention ? [8 + force / 2, 0] : [0, 0],
    status: settings.intervention
      ? `${settings.mode === 'a' ? 'The soft arm yields' : 'The stiff arm resists'} under the same sideways push.`
      : settings.wasPushed && displacement > 0.1
        ? 'The push is gone. Damping settles the arm back to its target.'
        : 'The arm is holding its target. Apply a push to compare responses.',
    outcome: progress < 1 ? 'running' : 'success',
    metrics: [
      { label: 'Displacement', value: `${displacement.toFixed(1)} units` },
      { label: 'Stiffness', value: `${stiffness}×` },
      {
        label: 'Applied force',
        value: `${settings.intervention ? force.toFixed(1) : '0.0'} units`,
      },
    ],
  }
}

function averaging(settings: ExperimentSettings, progress: number) {
  const start: Point2 = [24, 34],
    target: Point2 = [80, 34]
  const upper: Point2[] = [start, [38, 12], [64, 12], target]
  const lower: Point2[] = [start, [38, 56], [64, 56], target]
  const average = upper.map((point, index) => mix(point, lower[index], 0.5))
  const obstacle = settings.intervention ? null : { x: 44, y: 22, width: 14, height: 24 }
  const result = frame(settings.mode === 'a' ? average : upper, target, progress, obstacle)
  result.ghostPaths = [upper, lower]
  if (result.outcome === 'blocked')
    result.status = 'Both demonstrations avoid the obstacle. Their average runs into it.'
  else if (result.outcome === 'success')
    result.status =
      settings.mode === 'b'
        ? 'Choosing one complete demonstration preserves a successful route.'
        : 'Without the obstacle, the average route can reach the ring.'
  return result
}

function reward(settings: ExperimentSettings, progress: number) {
  const start: Point2 = [24, 46],
    target: Point2 = [77, 32]
  const halfSize = settings.intervention ? 5 : 2
  const startDistance = distance(start, target)
  const score = (point: Point2) =>
    settings.mode === 'a'
      ? Math.min(1, Math.max(0, (startDistance - distance(point, target)) / (startDistance - 12)))
      : distance(point, target) + Math.SQRT2 * halfSize <= 10
        ? 1
        : 0
  // Search moves in order of increasing travel, taking the first maximum score.
  let destination = target
  for (let step = 0; step <= 1000; step++) {
    const candidate = mix(start, target, step / 1000)
    if (score(candidate) >= 1) {
      destination = candidate
      break
    }
  }
  const result = frame([start, destination], target, progress)
  const contained = distance(result.object, target) + Math.SQRT2 * halfSize <= 10
  result.metrics = [
    { label: 'Score', value: `${Math.round(score(result.object) * 100)} / 100` },
    { label: 'Cube fully inside', value: contained ? 'Yes' : 'No' },
    { label: 'Cube width', value: `${halfSize * 2} units` },
  ]
  if (progress >= 1) {
    result.outcome = contained ? 'success' : 'blocked'
    result.status = contained
      ? 'Maximum score, with the entire cube inside the ring.'
      : 'Maximum score—but the cube is still outside. The score stopped rewarding progress too early.'
  } else result.status = 'Searching for the shortest move that earns the maximum score…'
  return result
}

function perception(settings: ExperimentSettings, progress: number) {
  const start: Point2 = [25, 48],
    lastSeen: Point2 = [64, 24]
  const actual: Point2 = settings.intervention ? [78, 39] : lastSeen
  const looking = settings.intervention && settings.mode === 'b'
  const observed = !settings.intervention || (looking && progress >= 0.35)
  const estimate = observed ? actual : lastSeen
  const path: Point2[] = looking ? [start, [44, 55], actual] : [start, estimate]
  const tip =
    looking && progress < 0.35
      ? mix(start, [44, 55], progress / 0.35)
      : onPath(looking ? [[44, 55], actual] : path, looking ? (progress - 0.35) / 0.65 : progress)
  const result = frame(path, actual, progress)
  result.tip = tip
  result.object = actual
  result.estimate = estimate
  result.uncertainty = observed ? 0 : 15
  // A side observation changes what is known, not the physical screen.
  result.obstacle = settings.intervention ? { x: 58, y: 15, width: 28, height: 35 } : null
  result.metrics = [
    { label: 'Position error', value: `${distance(estimate, actual).toFixed(1)} units` },
    { label: 'Observation', value: observed ? 'Current' : 'Last seen' },
  ]
  if (progress >= 1) {
    result.outcome = distance(tip, actual) < 1 ? 'success' : 'uncertain'
    result.status =
      result.outcome === 'success'
        ? looking
          ? 'A new viewpoint revealed the cube. The reach used the updated position.'
          : 'The visible cube was reached accurately.'
        : 'The arm reached the last seen position. The hidden cube had moved.'
  } else
    result.status = looking
      ? observed
        ? 'The side view revealed the new position. Now reaching for the cube…'
        : 'Moving to a side viewpoint before reaching…'
      : settings.intervention
        ? 'Reaching from the last observation, without seeing the hidden movement…'
        : 'The cube is visible. The estimate matches its position.'
  return result
}

function grasps(settings: ExperimentSettings, progress: number) {
  const target: Point2 = [65, 32],
    start: Point2 = [25, 48]
  const halfWidth = 3 + clamp(settings.amount / 100) * 4
  const candidates = [Math.PI, -Math.PI / 2, 0, Math.PI / 2].map((angle) => {
    const point: Point2 = [
      target[0] + Math.cos(angle) * (Math.abs(Math.cos(angle)) * halfWidth + 10),
      target[1] + Math.sin(angle) * 13,
    ]
    const width = Math.abs(Math.sin(angle)) > 0.5 ? halfWidth * 2 : 6
    const blocked = settings.intervention && Math.cos(angle) < -0.5
    return { point, angle, valid: !blocked && width <= 10, selected: false }
  })
  const chosen =
    settings.mode === 'a' ? candidates[0] : candidates.find((candidate) => candidate.valid)
  if (chosen) chosen.selected = true
  const destination = chosen?.point ?? start
  const obstacle = settings.intervention ? { x: 40, y: 23, width: 15, height: 18 } : null
  const path: Point2[] =
    settings.intervention && chosen?.valid
      ? [
          start,
          [30, destination[1] < target[1] ? 12 : 56],
          [destination[0], destination[1] < target[1] ? 12 : 56],
          destination,
        ]
      : [start, destination]
  const result = frame(path, target, progress, obstacle)
  result.object = target
  result.grasps = candidates
  result.metrics = [
    {
      label: 'Valid approaches',
      value: `${candidates.filter((candidate) => candidate.valid).length} / ${candidates.length}`,
    },
    { label: 'Object width', value: `${(halfWidth * 2).toFixed(1)} units` },
    { label: 'Gripper opening', value: '10 units' },
  ]
  if (progress >= 1) {
    result.outcome = chosen?.valid ? 'success' : 'blocked'
    result.status = chosen?.valid
      ? 'A clear approach fits the gripper. This geometric grasp remains available.'
      : 'The preferred approach is blocked. A single stored grasp has no fallback.'
  } else
    result.status = chosen?.valid
      ? 'Approaching a candidate that clears the obstacles and fits the gripper…'
      : 'The preferred approach is blocked. Compare keeping alternative grasps.'
  return result
}

export function deriveExperiment(
  id: ExperimentId,
  settings: ExperimentSettings,
  progress: number,
): ExperimentFrame {
  const safeProgress = clamp(progress)
  switch (id) {
    case 'planning':
      return planning(settings, safeProgress)
    case 'compliance':
      return compliance(settings, safeProgress)
    case 'averaging':
      return averaging(settings, safeProgress)
    case 'reward':
      return reward(settings, safeProgress)
    case 'perception':
      return perception(settings, safeProgress)
    case 'grasps':
      return grasps(settings, safeProgress)
  }
}
