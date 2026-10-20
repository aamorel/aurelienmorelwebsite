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

export default memo(function Hobbies({
  motionEnabled,
  open,
  onToggle,
  onChess,
}: {
  motionEnabled: boolean
  open: boolean
  onToggle: () => void
  onChess: () => void
}) {
  const [hovered, setHovered] = useState<Hobby | null>(null)
  const compact = useMediaQuery('(max-width: 760px)')
  const display = useRef<HTMLDivElement>(null)
  const active = useSceneVisibility(display)

  return (
    <section className="hobbies-section" aria-label="Away from the workbench">
      <button
        className="hobbies-toggle"
        aria-expanded={open}
        aria-controls="hobbies-body"
        onClick={onToggle}
        aria-label={open ? 'Hide hobbies' : 'Show hobbies'}
      >
        <span aria-hidden="true">{open ? '‹' : '›'}</span>
      </button>
      <div id="hobbies-body" className="hobbies-body" inert={!compact && !open}>
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
                  active={active && (compact || open)}
                  motionEnabled={motionEnabled}
                  hovered={hovered}
                />
              </Suspense>
            </HobbyBoundary>
          </div>
          <ul className="hobbies-list" aria-label="My hobbies" role="list">
            {hobbies.map((hobby) => (
              <li
                key={hobby.id}
                aria-label={
                  hobby.id === 'sports' ? 'Sports: basketball, volleyball, running' : undefined
                }
                title={hobby.id === 'sports' ? 'Basketball, volleyball, running' : undefined}
                onPointerEnter={() => setHovered(hobby.id)}
                onPointerLeave={() => setHovered(null)}
              >
                {hobby.id === 'chess' && (
                  <button
                    className="chess-trigger"
                    aria-label="Open chess puzzle"
                    onClick={onChess}
                    onFocus={() => setHovered('chess')}
                    onBlur={() => setHovered(null)}
                  />
                )}
                <span className="hobby-caption">{hobby.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
})
