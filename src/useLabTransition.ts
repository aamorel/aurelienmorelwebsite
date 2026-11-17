import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

type Transition = { skipTransition: () => void; finished: Promise<void> }
type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => Transition
}

// Keep the old layout present until the browser has captured it. The canvas
// stays mounted; only its surrounding layout and the desk contents change.
export function useLabTransition(target: boolean, reducedMotion: boolean) {
  const [visible, setVisible] = useState(target)
  const transition = useRef<Transition | null>(null)
  const generation = useRef(0)
  useLayoutEffect(() => {
    const current = ++generation.current
    transition.current?.skipTransition()
    if (visible === target) return
    const doc = document as TransitionDocument
    if (reducedMotion || !doc.startViewTransition) {
      setVisible(target)
      return
    }
    const next = doc.startViewTransition(() => {
      if (current !== generation.current) return
      flushSync(() => setVisible(target))
    })
    transition.current = next
    void next.finished
      .catch(() => {})
      .finally(() => {
        if (transition.current === next) transition.current = null
      })
    // A new navigation invalidates an update still waiting for its snapshot.
    return () => {
      generation.current++
      next.skipTransition()
    }
  }, [target, reducedMotion])
  return visible
}
