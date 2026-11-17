import { useEffect, useRef, useState } from 'react'

const DURATION = 6000
export function useExperimentPlayer(
  key: string | null,
  revision: number,
  enabled: boolean,
  reducedMotion: boolean,
) {
  const [progress, setProgress] = useState(0)
  const [run, setRun] = useState(0)
  const elapsed = useRef(0)
  useEffect(() => {
    elapsed.current = 0
    setProgress(reducedMotion ? 1 : 0)
  }, [key, revision, run, reducedMotion])
  useEffect(() => {
    if (!key || !enabled || reducedMotion) return
    let frame = 0
    let previous: number | null = null
    let lastPaint = -Infinity
    const tick = (now: number) => {
      if (previous !== null)
        elapsed.current = Math.min(DURATION, elapsed.current + Math.min(now - previous, 100))
      previous = now
      if (now - lastPaint >= 32 || elapsed.current === DURATION) {
        setProgress(elapsed.current / DURATION)
        lastPaint = now
      }
      if (elapsed.current < DURATION) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [key, revision, run, enabled, reducedMotion])
  return {
    progress,
    running: !!key && enabled && !reducedMotion && progress < 1,
    replay: () => setRun((value) => value + 1),
  }
}
