import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useExperimentPlayer } from './useExperimentPlayer'

type PlayerProps = {
  key: string | null
  revision: number
  enabled: boolean
  reducedMotion: boolean
}
const initial: PlayerProps = {
  key: 'planning',
  revision: 0,
  enabled: true,
  reducedMotion: false,
}
let pending: Map<number, FrameRequestCallback>
let nextId: number
let schedule: ReturnType<typeof vi.fn>
let cancel: ReturnType<typeof vi.fn>

beforeEach(() => {
  pending = new Map()
  nextId = 1
  schedule = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++
    pending.set(id, callback)
    return id
  })
  cancel = vi.fn((id: number) => pending.delete(id))
  vi.stubGlobal('requestAnimationFrame', schedule)
  vi.stubGlobal('cancelAnimationFrame', cancel)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function frame(now: number) {
  expect(pending.size).toBe(1)
  const [id, callback] = pending.entries().next().value!
  pending.delete(id)
  act(() => callback(now))
}
function player(props = initial) {
  return renderHook(
    (options: PlayerProps) =>
      useExperimentPlayer(options.key, options.revision, options.enabled, options.reducedMotion),
    { initialProps: props },
  )
}

it('advances from scheduled frame timestamps and stops scheduling when the run completes', () => {
  const { result } = player()
  expect(result.current.progress).toBe(0)
  expect(result.current.running).toBe(true)
  frame(0)
  frame(100)
  expect(result.current.progress).toBeCloseTo(100 / 6000)
  for (let time = 200; time <= 6000; time += 100) frame(time)
  expect(result.current.progress).toBe(1)
  expect(result.current.running).toBe(false)
  expect(pending.size).toBe(0)
})

it('restarts on a settings revision, replay, or experiment switch and cancels the prior frame', () => {
  const { result, rerender } = player()
  frame(0)
  frame(100)
  const previousFrame = pending.keys().next().value!
  rerender({ ...initial, revision: 1 })
  expect(cancel).toHaveBeenCalledWith(previousFrame)
  expect(result.current.progress).toBe(0)
  frame(1000)
  frame(1100)
  expect(result.current.progress).toBeCloseTo(100 / 6000)

  act(() => result.current.replay())
  expect(result.current.progress).toBe(0)
  frame(2000)
  frame(2100)
  expect(result.current.progress).toBeCloseTo(100 / 6000)

  rerender({ ...initial, key: 'compliance', revision: 1 })
  expect(result.current.progress).toBe(0)
  expect(pending.size).toBe(1)
})

it('freezes while disabled and resumes without counting the paused wall time', () => {
  const { result, rerender } = player()
  frame(0)
  frame(100)
  frame(200)
  const pausedProgress = result.current.progress
  rerender({ ...initial, enabled: false })
  expect(result.current.progress).toBe(pausedProgress)
  expect(result.current.running).toBe(false)
  expect(pending.size).toBe(0)

  rerender(initial)
  expect(result.current.running).toBe(true)
  frame(100000)
  expect(result.current.progress).toBe(pausedProgress)
  frame(100100)
  expect(result.current.progress).toBeCloseTo(pausedProgress + 100 / 6000)
})

it('shows a static final result with reduced motion, including comparisons and replay, without frames', () => {
  const staticProps = { ...initial, reducedMotion: true }
  const { result, rerender } = player(staticProps)
  expect(result.current.progress).toBe(1)
  expect(result.current.running).toBe(false)
  expect(schedule).not.toHaveBeenCalled()

  rerender({ ...staticProps, revision: 1 })
  expect(result.current.progress).toBe(1)
  act(() => result.current.replay())
  expect(result.current.progress).toBe(1)
  rerender({ ...staticProps, key: 'grasps', revision: 2 })
  expect(result.current.progress).toBe(1)
  expect(schedule).not.toHaveBeenCalled()
  expect(pending.size).toBe(0)

  rerender({ ...initial, key: null })
  expect(result.current.running).toBe(false)
  expect(pending.size).toBe(0)
})
