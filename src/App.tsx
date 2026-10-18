import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { profile, sections, type Section } from './content'
import { useNavigation } from './useNavigation'
import { useReducedMotion, useSceneVisibility } from './hooks'
import { ArrowIcon, ObjectIcon, RobotIcon } from './Icons'
import type { ArmPhase } from './scene/motion'
import ContentPanel from './ContentPanel'

const WorkbenchScene = lazy(() => import('./scene/WorkbenchScene'))

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Workbench scene unavailable:', error, info)
    this.props.onFailure()
  }
  render() {
    return this.state.failed ? <SceneFallback failed /> : this.props.children
  }
}

function SceneFallback({ failed = false }: { failed?: boolean }) {
  return (
    <div className="scene-fallback" role="status">
      <div className="fallback-icon">
        <RobotIcon />
      </div>
      <span className="eyebrow">
        {failed ? 'THE WORKBENCH IS TAKING A BREAK' : 'SETTING OUT THE WORKBENCH'}
      </span>
      <p>
        {failed
          ? 'You can still explore everything using the links.'
          : 'A tiny world is coming together…'}
      </p>
    </div>
  )
}

export default function App() {
  const reducedMotion = useReducedMotion()
  const [motionPaused, setMotionPaused] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [armPhase, setArmPhase] = useState<ArmPhase>('idle')
  const [spawnRevision, setSpawnRevision] = useState(0)
  const playing = armPhase === 'playing'
  const [hovered, setHovered] = useState<Section | null>(null)
  const sceneRegion = useRef<HTMLDivElement>(null)
  const sceneVisible = useSceneVisibility(sceneRegion)
  const navigation = useNavigation(
    reducedMotion || motionPaused || sceneFailed || !sceneReady || !sceneVisible,
  )
  const onFailure = useCallback(() => setSceneFailed(true), [])
  const onReady = useCallback(() => setSceneReady(true), [])
  const select = (section: Section, origin?: HTMLElement | null) =>
    navigation.select(
      section,
      origin ?? document.querySelector<HTMLElement>(`nav a[href="#${section}"]`),
    )

  return (
    <div className="site-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <a
          className="wordmark"
          href="#"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            navigation.close()
            event.currentTarget.focus({ preventScroll: true })
          }}
          aria-label="Aurélien’s workbench, home"
        >
          <RobotIcon />
          <span>
            Aurélien’s workbench<span className="wordmark-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={navigation.selected === section.id ? 'page' : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                select(section.id, event.currentTarget)
              }}
              onMouseEnter={() => setHovered(section.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(section.id)}
              onBlur={() => setHovered(null)}
            >
              {section.label}
            </a>
          ))}
        </nav>
        <a className="header-contact" href={`mailto:${profile.email}`}>
          Say hello <ArrowIcon diagonal />
        </a>
      </header>
      <main id="main">
        <section className="introduction" aria-labelledby="site-heading">
          <div className="intro-copy">
            <div className="identity">
              <span className="status-dot" />
              <span>
                {profile.name} <span className="identity-divider">/</span> {profile.role}
              </span>
            </div>
            <h1 id="site-heading">
              {profile.headline[0]}
              <br />
              <em>{profile.headline[1]}</em>
            </h1>
            <p>{profile.introduction}</p>
          </div>
        </section>
        <div className={`workbench-layout ${navigation.visible ? 'has-panel' : ''}`}>
          <section className="scene-section" aria-label="Interactive robot workbench">
            <div className="scene-topline">
              <span className="eyebrow">
                FIG. 01 <span className="caption-divider">/</span> THE CURIOSITY DESK
              </span>
              <span className="live-state">
                <span
                  className={`status-dot ${navigation.mode === 'reaching' || playing ? 'busy' : ''}`}
                />
                {sceneFailed
                  ? 'AT REST'
                  : navigation.mode === 'reaching'
                    ? 'ON MY WAY'
                    : reducedMotion || motionPaused
                      ? 'AT REST'
                      : playing
                        ? 'MAKING ROOM'
                        : navigation.mode === 'reading'
                          ? 'TAKE YOUR TIME'
                          : 'QUIETLY CURIOUS'}
              </span>
            </div>
            <div className="scene-viewport" ref={sceneRegion}>
              <SceneBoundary onFailure={onFailure}>
                <Suspense fallback={<SceneFallback />}>
                  <WorkbenchScene
                    selected={navigation.selected}
                    mode={navigation.mode}
                    revision={navigation.revision}
                    hovered={hovered}
                    setHovered={setHovered}
                    select={select}
                    motionEnabled={!reducedMotion && !motionPaused}
                    active={sceneVisible}
                    onReady={onReady}
                    onFailure={onFailure}
                    spawnRevision={spawnRevision}
                    onPhaseChange={setArmPhase}
                  />
                </Suspense>
              </SceneBoundary>
              <div className="scene-corner corner-tl" />
              <div className="scene-corner corner-br" />
            </div>
            <div className="scene-bottomline">
              <span className="scene-hint">
                <span aria-hidden="true">↖</span> Pick an object. Follow your curiosity.
              </span>
              <div className="scene-controls">
                <button
                  className="spawn-cube"
                  disabled={
                    !sceneReady ||
                    sceneFailed ||
                    !sceneVisible ||
                    reducedMotion ||
                    motionPaused ||
                    armPhase !== 'idle' ||
                    navigation.mode === 'reaching'
                  }
                  onClick={() => {
                    setArmPhase('playing')
                    setSpawnRevision((revision) => revision + 1)
                  }}
                >
                  <ObjectIcon kind="work" />
                  Spawn a cube
                </button>
                <button
                  className="motion-toggle"
                  onClick={() => setMotionPaused(!motionPaused)}
                  disabled={reducedMotion}
                  aria-pressed={motionPaused || reducedMotion}
                  aria-label={
                    reducedMotion
                      ? 'Motion disabled by system preference'
                      : motionPaused
                        ? 'Resume robot motion'
                        : 'Pause robot motion'
                  }
                >
                  <span aria-hidden="true">{motionPaused || reducedMotion ? '▷' : 'Ⅱ'}</span>
                  {reducedMotion
                    ? 'Reduced motion'
                    : motionPaused
                      ? 'Resume motion'
                      : 'Pause motion'}
                </button>
              </div>
            </div>
          </section>
          <ContentPanel {...navigation} select={select} />
        </div>
        <section className="contact-strip" id="contact" aria-labelledby="contact-heading">
          <div>
            <span className="eyebrow">THE NEXT CHAPTER</span>
            <h2 id="contact-heading">Let’s talk robotics.</h2>
            <p>Research, collaboration, or something worth building together.</p>
          </div>
          <div className="contact-details">
            <a className="contact-email" href={`mailto:${profile.email}`}>
              {profile.email}
              <ArrowIcon diagonal />
            </a>
            <div className="contact-profiles">
              <span>{profile.location}</span>
              {profile.links.map((link) => (
                <a href={link.url} key={link.url}>
                  {link.label}
                  <ArrowIcon diagonal />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>
          Made with care{' '}
          <span className="footer-star" aria-hidden="true">
            ✳
          </span>{' '}
          and a little engineering.
        </span>
        <span>
          Always a work in progress.<span className="footer-version"> v.01</span>
        </span>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">
        {navigation.mode === 'reaching'
          ? `Opening ${navigation.selected}`
          : navigation.visible
            ? `${navigation.visible} section open`
            : ''}
      </div>
    </div>
  )
}
