import { useEffect, useState, type RefObject } from 'react'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

export function useSceneVisibility(ref: RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    let inView = true
    const update = () => setVisible(inView && !document.hidden)
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        update()
      },
      { threshold: 0.05 },
    )
    if (ref.current) observer.observe(ref.current)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [ref])
  return visible
}
