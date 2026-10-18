import { useEffect, useState, type RefObject } from 'react'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useCanTrack() {
  return useMediaQuery('(min-width: 761px) and (hover: hover) and (pointer: fine)')
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
