import { useCallback, useEffect, useRef, useState } from 'react'
import { parseSection, type Section } from './content'

export const REVEAL_DELAY = 720
export type Mode = 'idle' | 'reaching' | 'reading'
export type NavigationState = {
  selected: Section | null
  visible: Section | null
  mode: Mode
  revision: number
}

export function useNavigation(immediate: boolean) {
  const [state, setState] = useState<NavigationState>(() => {
    const selected = parseSection(window.location.hash)
    return { selected, visible: selected, mode: selected ? 'reading' : 'idle', revision: 0 }
  })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generation = useRef(0)
  const focusRequested = useRef(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  const cancel = useCallback(() => {
    generation.current += 1
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const select = useCallback(
    (section: Section, origin?: HTMLElement | null) => {
      cancel()
      const request = generation.current
      if (origin) returnFocus.current = origin
      focusRequested.current = true
      if (window.location.hash !== `#${section}`) window.history.pushState(null, '', `#${section}`)
      setState((previous) => ({
        selected: section,
        visible: immediate ? section : previous.visible,
        mode: immediate ? 'reading' : 'reaching',
        revision: previous.revision + 1,
      }))
      if (!immediate) {
        timer.current = setTimeout(() => {
          if (generation.current !== request) return
          setState((previous) => ({ ...previous, visible: section, mode: 'reading' }))
        }, REVEAL_DELAY)
      }
    },
    [cancel, immediate],
  )

  const close = useCallback(() => {
    cancel()
    focusRequested.current = false
    const closing = parseSection(window.location.hash)
    window.history.pushState(null, '', window.location.pathname + window.location.search)
    setState((previous) => ({
      selected: null,
      visible: null,
      mode: 'idle',
      revision: previous.revision + 1,
    }))
    const origin = returnFocus.current?.isConnected
      ? returnFocus.current
      : document.querySelector<HTMLElement>(`nav a[href="#${closing}"]`)
    origin?.focus({ preventScroll: true })
  }, [cancel])

  useEffect(() => {
    const sync = () => {
      cancel()
      focusRequested.current = false
      const selected = parseSection(window.location.hash)
      setState((previous) => ({
        selected,
        visible: selected,
        mode: selected ? 'reading' : 'idle',
        revision: previous.revision + 1,
      }))
    }
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      cancel()
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [cancel])

  useEffect(() => {
    if (immediate && state.mode === 'reaching') {
      cancel()
      setState((previous) => ({ ...previous, visible: previous.selected, mode: 'reading' }))
    }
  }, [immediate, state.mode, cancel])

  useEffect(() => {
    if (!state.selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.selected, close])

  return { ...state, select, close, focusRequested }
}
