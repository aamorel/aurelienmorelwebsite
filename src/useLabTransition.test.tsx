import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLabTransition } from './useLabTransition'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    get: () => undefined,
  })
})

function mockTransitions() {
  const updates: (() => void)[] = []
  const skip = vi.fn()
  const start = vi.fn((update: () => void) => {
    updates.push(update)
    return { skipTransition: skip, finished: Promise.resolve() }
  })
  Object.defineProperty(document, 'startViewTransition', { configurable: true, get: () => start })
  return { updates, skip, start }
}

// Define a configurable capability slot for jsdom, which has no browser snapshots.
Object.defineProperty(document, 'startViewTransition', { configurable: true, get: () => undefined })

describe('lab view transitions', () => {
  it('retains the outgoing layout until capture and transitions in both directions', () => {
    const { updates } = mockTransitions()
    const { result, rerender } = renderHook(({ target }) => useLabTransition(target, false), {
      initialProps: { target: false },
    })
    rerender({ target: true })
    expect(result.current).toBe(false)
    act(() => updates[0]())
    expect(result.current).toBe(true)
    rerender({ target: false })
    expect(result.current).toBe(true)
    act(() => updates[1]())
    expect(result.current).toBe(false)
  })
  it('ignores a stale snapshot callback after a rapid reversal', () => {
    const { updates, skip } = mockTransitions()
    const { result, rerender } = renderHook(({ target }) => useLabTransition(target, false), {
      initialProps: { target: false },
    })
    rerender({ target: true })
    rerender({ target: false })
    act(() => updates[0]())
    expect(skip).toHaveBeenCalled()
    expect(result.current).toBe(false)
  })
  it('switches immediately for reduced motion without requesting a snapshot', () => {
    const { start } = mockTransitions()
    const { result, rerender } = renderHook(({ target }) => useLabTransition(target, true), {
      initialProps: { target: false },
    })
    rerender({ target: true })
    expect(result.current).toBe(true)
    expect(start).not.toHaveBeenCalled()
  })
})
