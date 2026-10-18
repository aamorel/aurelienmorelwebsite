import { describe, expect, it } from 'vitest'
import type { Section } from '../content'
import { IDLE_POSES, TARGETS, WELCOME, toolPosition } from './config'
import { ArmMotion } from './motion'
import { CUBE_SPOTS } from './cubeRoutine'

function advance(motion: ArmMotion, seconds: number) {
  for (let frame = 0; frame < Math.round(seconds * 100); frame++) {
    motion.tick(0.01)
    expect(toolPosition(motion.pose)[1]).toBeGreaterThan(0.08)
  }
}

const reach = (selected: Section, revision = 1) => ({
  selected,
  revision,
  mode: 'reaching' as const,
  motionEnabled: true,
})

describe('independent arm gestures', () => {
  it.each<Section>(['education', 'work', 'publications'])(
    'taps %s, returns home, and wanders while the section stays open',
    (selected) => {
      const motion = new ArmMotion()
      motion.sync(reach(selected))
      advance(motion, 0.72)
      expect(motion.pose).toEqual(TARGETS[selected].touch)

      motion.sync({ ...reach(selected), mode: 'reading' })
      advance(motion, 0.3)
      expect(motion.phase).toBe('returning')
      advance(motion, 1)
      expect(motion.phase).toBe('idle')
      expect(motion.pose).toEqual(WELCOME)

      advance(motion, 6)
      expect(motion.pose).toEqual(IDLE_POSES[1])
      expect(motion.phase).toBe('idle')
    },
  )

  it.each([0.4, 1.1])(
    'can interrupt a gesture at %s seconds without jumping or finishing the old gesture',
    (seconds) => {
      const motion = new ArmMotion()
      motion.sync(reach('education'))
      advance(motion, seconds)
      const interruptedPose = [...motion.pose]
      motion.sync(reach('work', 2))
      expect(motion.pose).toEqual(interruptedPose)
      advance(motion, 0.72)
      expect(motion.pose).toEqual(TARGETS.work.touch)
      motion.sync({ ...reach('work', 2), mode: 'reading' })
      advance(motion, 1.3)
      expect(motion.pose).toEqual(WELCOME)
    },
  )

  it('returns home when the section is closed mid-gesture', () => {
    const motion = new ArmMotion()
    motion.sync(reach('publications'))
    advance(motion, 0.72)
    motion.sync({ selected: null, revision: 2, mode: 'idle', motionEnabled: true })
    expect(motion.phase).toBe('returning')
    advance(motion, 1.1)
    expect(motion.pose).toEqual(WELCOME)
    expect(motion.phase).toBe('idle')
  })

  it('wanders from the default pose for a direct link without replaying a tap', () => {
    const motion = new ArmMotion()
    motion.sync({ ...reach('education'), mode: 'reading' })
    advance(motion, 2)
    expect(motion.pose).toEqual(WELCOME)
    advance(motion, 4)
    expect(motion.pose).toEqual(IDLE_POSES[1])
  })

  it('honors disabled motion and resumes wandering without repeating the selection', () => {
    const motion = new ArmMotion()
    motion.sync(reach('education'))
    advance(motion, 0.6)
    motion.sync({ ...reach('education'), motionEnabled: false })
    advance(motion, 10)
    expect(motion.pose).toEqual(WELCOME)
    motion.sync({ ...reach('education'), mode: 'reading', motionEnabled: false })
    motion.sync({ ...reach('education'), mode: 'reading' })
    advance(motion, 2)
    expect(motion.pose).toEqual(WELCOME)
    advance(motion, 4)
    expect(motion.pose).toEqual(IDLE_POSES[1])
  })
})

describe('occasional idle play', () => {
  const idle = { selected: null, revision: 0, mode: 'idle' as const, motionEnabled: true }

  it('waits before the first cube and spaces out subsequent routines', () => {
    const motion = new ArmMotion(() => 0)
    motion.sync(idle)
    advance(motion, 8.9)
    expect(motion.cube).toBeNull()
    advance(motion, 0.2)
    expect(motion.phase).toBe('playing')
    expect(motion.cube?.phase).toBe('appearing')
    advance(motion, 6.1)
    expect(motion.cube).toBeNull()
    expect(motion.pose).toEqual(WELCOME)
    advance(motion, 17.7)
    expect(motion.phase).toBe('idle')
    advance(motion, 0.4)
    expect(motion.phase).toBe('playing')
  })

  it.each([0.5, 3, 4.9])('lets navigation interrupt the routine at %s seconds', (time) => {
    const motion = new ArmMotion(() => 0)
    motion.sync(idle)
    advance(motion, 9.01 + time)
    expect(motion.cube).not.toBeNull()
    const pose = [...motion.pose]
    motion.sync(reach('education'))
    expect(motion.cube).toBeNull()
    expect(motion.pose).toEqual(pose)
    advance(motion, 0.72)
    expect(motion.pose).toEqual(TARGETS.education.touch)
    motion.sync({ ...reach('education'), mode: 'reading' })
    advance(motion, 2)
    expect(motion.cube).toBeNull()
    expect(motion.phase).toBe('idle')
  })

  it('clears a held cube when paused, and does not accumulate time while disabled', () => {
    const motion = new ArmMotion(() => 0)
    motion.sync(idle)
    advance(motion, 12.1)
    expect(motion.cube?.phase).toBe('held')
    motion.sync({ ...idle, motionEnabled: false })
    advance(motion, 60)
    expect(motion.cube).toBeNull()
    expect(motion.pose).toEqual(WELCOME)
    motion.sync(idle)
    advance(motion, 8.9)
    expect(motion.cube).toBeNull()
    advance(motion, 0.2)
    expect(motion.phase).toBe('playing')
  })

  it.each<Section>(['education', 'work', 'publications'])(
    'supports manual and random play while %s remains open',
    (selected) => {
      const motion = new ArmMotion(() => 0)
      const reading = { ...reach(selected), mode: 'reading' as const }
      motion.sync(reach(selected))
      expect(motion.spawnCube()).toBe(false)
      advance(motion, 0.72)
      motion.sync(reading)
      advance(motion, 0.3)
      expect(motion.phase).toBe('returning')
      expect(motion.spawnCube()).toBe(false)
      advance(motion, 1)
      advance(motion, 9)
      expect(motion.phase).toBe('playing')
      advance(motion, 6.2)
      expect(motion.spawnCube()).toBe(true)
      motion.sync(reading)
      expect(motion.phase).toBe('playing')
      advance(motion, 6.2)
      expect(motion.phase).toBe('idle')
      expect(motion.pose).toEqual(WELCOME)
    },
  )

  it('rejects duplicate clicks and restarts the random cooldown after manual play', () => {
    const motion = new ArmMotion(() => 0)
    expect(motion.spawnCube()).toBe(false)
    motion.sync(idle)
    advance(motion, 8.8)
    expect(motion.spawnCube()).toBe(true)
    advance(motion, 3)
    const held = motion.cube
    expect(motion.spawnCube()).toBe(false)
    expect(motion.cube).toBe(held)
    advance(motion, 3.2)
    expect(motion.phase).toBe('idle')
    advance(motion, 17.7)
    expect(motion.cube).toBeNull()
    advance(motion, 0.4)
    expect(motion.phase).toBe('playing')
    motion.sync({ ...idle, motionEnabled: false })
    expect(motion.spawnCube()).toBe(false)
  })

  it.each([0, 0.25, 0.5, 0.75])(
    'randomly chooses a spot without immediate repeats (%s)',
    (random) => {
      const motion = new ArmMotion(() => random)
      motion.sync(idle)
      motion.spawnCube()
      advance(motion, 0.4)
      const first = [...motion.cube!.position]
      expect(first).toEqual(CUBE_SPOTS[Math.floor(random * CUBE_SPOTS.length)])
      advance(motion, 5.8)
      motion.spawnCube()
      advance(motion, 0.4)
      expect(motion.cube!.position).not.toEqual(first)
      expect(CUBE_SPOTS).toContainEqual(motion.cube!.position)
    },
  )

  it('does not catch up through an offscreen interval', () => {
    const motion = new ArmMotion(() => 0)
    motion.sync(idle)
    advance(motion, 12.1)
    const before = [...motion.pose]
    motion.tick(90)
    expect(motion.cube?.phase).toBe('held')
    expect(Math.max(...motion.pose.map((value, i) => Math.abs(value - before[i])))).toBeLessThan(
      0.2,
    )
  })
})
