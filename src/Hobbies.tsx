import { Component, lazy, memo, Suspense, useRef, useState, type ReactNode } from 'react'
import { hobbies, type Hobby } from './content'
import { useMediaQuery, useSceneVisibility } from './hooks'

const HobbiesScene = lazy(() => import('./scene/HobbiesScene'))

// The names remain available if this decorative display cannot render.
class HobbyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default memo(function Hobbies({ motionEnabled }: { motionEnabled: boolean }) {
  const [hovered, setHovered] = useState<Hobby | null>(null)
  const compact = useMediaQuery('(max-width: 760px)')
  const display = useRef<HTMLDivElement>(null)
  const active = useSceneVisibility(display)

  return (
    <section className="hobbies-section" aria-labelledby="hobbies-heading">
      <div className="hobbies-heading">
        <div>
          <span className="eyebrow">A LITTLE MORE ABOUT ME</span>
          <h2 id="hobbies-heading">Away from the workbench.</h2>
        </div>
        <p>Making music, playing a game, or heading out for a run.</p>
      </div>
      <div className="hobbies-display" ref={display}>
        <div className="hobbies-canvas" aria-hidden="true">
          <HobbyBoundary>
            <Suspense fallback={null}>
              <HobbiesScene
                compact={compact}
                active={active}
                motionEnabled={motionEnabled}
                hovered={hovered}
              />
            </Suspense>
          </HobbyBoundary>
        </div>
        <ul className="hobbies-list" aria-label="My hobbies" role="list">
          {hobbies.map((hobby, index) => (
            <li
              key={hobby.id}
              onPointerEnter={() => setHovered(hobby.id)}
              onPointerLeave={() => setHovered(null)}
            >
              <span className="hobby-caption">
                <span className="hobby-number" aria-hidden="true">
                  0{index + 1}
                </span>
                {hobby.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
})
