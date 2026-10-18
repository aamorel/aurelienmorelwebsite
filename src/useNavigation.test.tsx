import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REVEAL_DELAY, useNavigation } from './useNavigation'

beforeEach(() => {
  vi.useFakeTimers()
  window.history.replaceState(null, '', '/')
  document.body.innerHTML = ''
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('navigation independent of animation', () => {
  it.each(['publications', 'education', 'work'] as const)('loads #%s immediately', (section) => {
    window.history.replaceState(null, '', `/#${section}`)
    const { result } = renderHook(() => useNavigation(false))
    expect(result.current.visible).toBe(section)
    expect(result.current.mode).toBe('reading')
  })

  it.each([
    ['about', 'education'],
    ['projects', 'work'],
  ])('preserves the old #%s destination', (oldHash, section) => {
    window.history.replaceState(null, '', `/#${oldHash}`)
    const { result } = renderHook(() => useNavigation(false))
    expect(result.current.visible).toBe(section)
    expect(result.current.mode).toBe('reading')
  })

  it('acknowledges selection immediately and reveals without a scene callback', () => {
    const { result } = renderHook(() => useNavigation(false))
    act(() => result.current.select('work'))
    expect(window.location.hash).toBe('#work')
    expect(result.current.selected).toBe('work')
    expect(result.current.mode).toBe('reaching')
    expect(result.current.visible).toBeNull()
    act(() => vi.advanceTimersByTime(REVEAL_DELAY))
    expect(result.current.visible).toBe('work')
  })

  it('cancels stale completion when a reach is interrupted', () => {
    const { result } = renderHook(() => useNavigation(false))
    act(() => result.current.select('education'))
    act(() => vi.advanceTimersByTime(400))
    act(() => result.current.select('work'))
    act(() => vi.advanceTimersByTime(400))
    expect(result.current.visible).toBeNull()
    act(() => result.current.select('publications'))
    act(() => vi.advanceTimersByTime(REVEAL_DELAY))
    expect(result.current.visible).toBe('publications')
    expect(result.current.selected).toBe('publications')
    expect(window.location.hash).toBe('#publications')
  })

  it('closing a reach cancels its timer and restores the original focus', () => {
    const origin = document.createElement('button')
    document.body.append(origin)
    const { result } = renderHook(() => useNavigation(false))
    act(() => result.current.select('education', origin))
    act(() => result.current.close())
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.visible).toBeNull()
    expect(result.current.mode).toBe('idle')
    expect(document.activeElement).toBe(origin)
    expect(window.location.hash).toBe('')
  })

  it('keeps an open panel stable while reaching for another section', () => {
    const { result } = renderHook(() => useNavigation(false))
    act(() => result.current.select('education'))
    act(() => vi.advanceTimersByTime(REVEAL_DELAY))
    act(() => result.current.select('work'))
    expect(result.current.visible).toBe('education')
    expect(result.current.selected).toBe('work')
    expect(result.current.mode).toBe('reaching')
    act(() => vi.advanceTimersByTime(REVEAL_DELAY))
    expect(result.current.visible).toBe('work')
  })

  it('restores focus to persistent navigation if the source link was removed', () => {
    document.body.innerHTML = '<nav><a href="#work">Projects</a></nav>'
    const origin = document.createElement('button')
    document.body.append(origin)
    const { result } = renderHook(() => useNavigation(true))
    act(() => result.current.select('work', origin))
    origin.remove()
    act(() => result.current.close())
    expect(document.activeElement).toBe(document.querySelector('nav a'))
  })

  it('reduced motion, paused motion, or an unavailable scene reveals immediately', () => {
    const { result } = renderHook(() => useNavigation(true))
    act(() => result.current.select('publications'))
    expect(result.current.visible).toBe('publications')
    expect(result.current.mode).toBe('reading')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('settles a pending reach if motion is disabled midway', () => {
    const { result, rerender } = renderHook(({ immediate }) => useNavigation(immediate), {
      initialProps: { immediate: false },
    })
    act(() => result.current.select('work'))
    rerender({ immediate: true })
    expect(result.current.visible).toBe('work')
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['popstate', 'hashchange'])(
    'handles %s immediately and cancels any old reveal',
    (event) => {
      const { result } = renderHook(() => useNavigation(false))
      act(() => result.current.select('work'))
      act(() => {
        window.history.replaceState(null, '', '/#education')
        window.dispatchEvent(new Event(event))
      })
      expect(result.current.visible).toBe('education')
      act(() => vi.advanceTimersByTime(2000))
      expect(result.current.visible).toBe('education')
    },
  )

  it('ignores unknown hashes and closes on Escape', () => {
    window.history.replaceState(null, '', '/#unknown')
    const { result } = renderHook(() => useNavigation(true))
    expect(result.current.mode).toBe('idle')
    act(() => result.current.select('education'))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(result.current.visible).toBeNull()
  })

  it('cleans up pending navigation on unmount', () => {
    const { result, unmount } = renderHook(() => useNavigation(false))
    act(() => result.current.select('education'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
