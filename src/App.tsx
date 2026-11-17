import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { profile, sections, type Section } from './content'
import { useLabTransition } from './useLabTransition'
import { useNavigation } from './useNavigation'
import { useCanTrack, useReducedMotion, useSceneVisibility } from './hooks'
import { ArrowIcon, CheckIcon, DanceIcon, ObjectIcon, RobotIcon, TrackIcon } from './Icons'
import type { ArmPhase, BehaviorRequest, Behavior } from './scene/motion'
import { TRACK_DURATION } from './scene/trackRoutine'
import ContentPanel from './ContentPanel'
import Hobbies from './Hobbies'
import ChessPuzzle from './ChessPuzzle'
import RoboticsLab from './RoboticsLab'
import { EMPTY_LAB, type LabRequest, type LabSnapshot } from './lab'

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
  const [hobbiesOpen, setHobbiesOpen] = useState(true)
  const [chessOpen, setChessOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const canTrack = useCanTrack()
  const [motionPaused, setMotionPaused] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [armPhase, setArmPhase] = useState<ArmPhase>('idle')
  const [behaviorRequest, setBehaviorRequest] = useState<BehaviorRequest | null>(null)
  const [labRequest, setLabRequest] = useState<LabRequest | null>(null)
  const [labSnapshot, setLabSnapshot] = useState<LabSnapshot>(EMPTY_LAB)
  const [labTargetRevision, setLabTargetRevision] = useState(0)
  const playing = armPhase === 'playing'
  const dancing = armPhase === 'dancing'
  const tracking = armPhase === 'tracking'
  const [trackSeconds, setTrackSeconds] = useState(0)
  const [hovered, setHovered] = useState<Section | null>(null)
  const sceneRegion = useRef<HTMLDivElement>(null)
  const sceneVisible = useSceneVisibility(sceneRegion)
  const navigation = useNavigation(
    reducedMotion || motionPaused || sceneFailed || !sceneReady || !sceneVisible,
  )
  useEffect(() => {
    if (
      navigation.selected !== 'lab' ||
      !sceneReady ||
      sceneFailed ||
      reducedMotion ||
      motionPaused
    ) {
      setLabRequest(null)
      setLabSnapshot({ ...EMPTY_LAB })
    }
  }, [navigation.selected, sceneReady, sceneFailed, reducedMotion, motionPaused])
  useEffect(() => {
    setLabRequest(null)
    setLabSnapshot({ ...EMPTY_LAB })
  }, [navigation.revision])
  const [experimentOpen, setExperimentOpen] = useState(false)
  const experimentButton = useRef<HTMLButtonElement>(null)
  const wasExperimentOpen = useRef(false)
  useEffect(() => {
    if (wasExperimentOpen.current && !experimentOpen)
      experimentButton.current?.focus({ preventScroll: true })
    wasExperimentOpen.current = experimentOpen
  }, [experimentOpen])
  useEffect(() => {
    if (navigation.selected !== 'lab') setExperimentOpen(false)
  }, [navigation.selected])
  const labOpen = useLabTransition(navigation.selected === 'lab', reducedMotion)
  const labHeading = useRef<HTMLHeadingElement>(null)
  const wasLabOpen = useRef(false)
  useEffect(() => {
    if (labOpen) {
      labHeading.current?.focus({ preventScroll: true })
      labHeading.current?.scrollIntoView({
        block: 'start',
        behavior: reducedMotion ? 'instant' : 'smooth',
      })
    } else if (wasLabOpen.current) {
      document.querySelector<HTMLElement>('nav a[href="#lab"]')?.focus({ preventScroll: true })
    }
    wasLabOpen.current = labOpen
  }, [labOpen])
  const resetLab = () => {
    setLabRequest(null)
    setLabSnapshot({ ...EMPTY_LAB })
    navigation.select('lab')
  }
  const onFailure = useCallback(() => setSceneFailed(true), [])
  const onReady = useCallback(() => setSceneReady(true), [])
  const behaviorDisabled =
    navigation.selected === 'lab' ||
    !sceneReady ||
    sceneFailed ||
    !sceneVisible ||
    reducedMotion ||
    motionPaused ||
    armPhase !== 'idle' ||
    navigation.mode === 'reaching'
  const startBehavior = (kind: Behavior) => {
    setArmPhase(kind === 'cube' ? 'playing' : kind === 'dance' ? 'dancing' : 'tracking')
    if (kind === 'track') setTrackSeconds(TRACK_DURATION)
    setBehaviorRequest((previous) => ({ kind, revision: (previous?.revision ?? 0) + 1 }))
  }
  const select = (section: Section, origin?: HTMLElement | null) =>
    navigation.select(
      section,
      origin ?? document.querySelector<HTMLElement>(`nav a[href="#${section}"]`),
    )

  return (
    <div className={`site-shell ${labOpen ? 'lab-mode' : ''}`}>
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
        {!labOpen && (
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
        )}
        {labOpen ? (
          <button
            className="lab-return"
            onClick={() => {
              setLabRequest(null)
              navigation.close()
            }}
          >
            ← Return to the workbench
          </button>
        ) : (
          <a className="header-contact" href={`mailto:${profile.email}`}>
            Say hello <ArrowIcon diagonal />
          </a>
        )}
      </header>
      <main id="main">
        {labOpen ? (
          <section className="lab-introduction" aria-labelledby="lab-heading">
            <span className="eyebrow">A LITTLE SPACE TO EXPERIMENT</span>
            <h1 id="lab-heading" ref={labHeading} tabIndex={-1}>
              The robotics lab<span>.</span>
            </h1>
            <p>Pick a question. Try it on the arm. See what changes.</p>
          </section>
        ) : (
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
        )}
        <div
          className={`workbench-layout ${labOpen ? (experimentOpen ? 'has-panel' : '') : navigation.visible ? 'has-panel' : ''} ${hobbiesOpen && !labOpen ? 'has-hobbies' : ''} ${labOpen ? 'has-lab' : ''}`}
        >
          {!labOpen && (
            <Hobbies
              motionEnabled={!reducedMotion && !motionPaused && !chessOpen}
              open={hobbiesOpen && !labOpen}
              onToggle={() => setHobbiesOpen(!hobbiesOpen)}
              onChess={() => setChessOpen(true)}
            />
          )}
          <section className="scene-section" aria-label="Interactive robot workbench">
            <div className="scene-topline">
              <span className="eyebrow">
                {labOpen ? 'THE EXPERIMENT BENCH' : 'THE CURIOSITY DESK'}
              </span>
              <span className="live-state">
                <span
                  className={`status-dot ${navigation.mode === 'reaching' || playing || dancing || tracking ? 'busy' : ''}`}
                />
                {sceneFailed
                  ? 'AT REST'
                  : armPhase === 'experiment'
                    ? 'RUNNING AN EXPERIMENT'
                    : navigation.mode === 'reaching'
                      ? 'ON MY WAY'
                      : reducedMotion || motionPaused
                        ? 'AT REST'
                        : playing
                          ? 'TAKING A SHOT'
                          : dancing
                            ? 'FEELING THE GROOVE'
                            : tracking
                              ? `FOLLOWING YOU · ${trackSeconds}s`
                              : navigation.mode === 'reading'
                                ? 'TAKE YOUR TIME'
                                : 'QUIETLY CURIOUS'}
              </span>
            </div>
            <div className={`scene-viewport ${tracking ? 'is-tracking' : ''}`} ref={sceneRegion}>
              <div className="scene-renderer">
                <SceneBoundary onFailure={onFailure}>
                  <Suspense fallback={<SceneFallback />}>
                    <WorkbenchScene
                      labMode={labOpen}
                      labExperimentOpen={experimentOpen}
                      labRequest={labRequest}
                      labTargetRevision={labTargetRevision}
                      onLabUpdate={setLabSnapshot}
                      selected={navigation.selected}
                      mode={navigation.mode}
                      revision={navigation.revision}
                      hovered={hovered}
                      setHovered={setHovered}
                      select={select}
                      motionEnabled={!reducedMotion && !motionPaused}
                      active={sceneVisible && !chessOpen}
                      onReady={onReady}
                      onFailure={onFailure}
                      behaviorRequest={behaviorRequest}
                      onPhaseChange={setArmPhase}
                      trackEnabled={canTrack}
                      onTrackTimeChange={setTrackSeconds}
                    />
                  </Suspense>
                </SceneBoundary>
              </div>
              {!labOpen && (!sceneReady || sceneFailed) && (
                <div className="bench-labels" aria-label="Workbench objects">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`scene-label bench-label-${section.id} ${hovered === section.id || navigation.selected === section.id ? 'highlighted' : ''}`}
                      aria-current={navigation.selected === section.id ? 'page' : undefined}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                        event.preventDefault()
                        select(section.id, event.currentTarget)
                      }}
                      onPointerEnter={() => setHovered(section.id)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => setHovered(section.id)}
                      onBlur={() => setHovered(null)}
                    >
                      {section.label}
                      {navigation.selected === section.id ? <CheckIcon /> : <ArrowIcon diagonal />}
                    </a>
                  ))}
                </div>
              )}
              {labOpen && (
                <div
                  className={`experiment-vignettes ${experimentOpen ? 'is-selected' : ''}`}
                  hidden={experimentOpen}
                  inert={experimentOpen}
                  aria-label="Choose an experiment"
                >
                  <button
                    ref={experimentButton}
                    className="experiment-vignette"
                    aria-expanded={experimentOpen}
                    aria-controls="lab-experiment"
                    onClick={() => setExperimentOpen(true)}
                  >
                    <span className="vignette-art" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="eyebrow">01 · LEARNING & CONTROL</span>
                    <strong>Action chunking</strong>
                    <span>One action, or a plan ahead?</span>
                    <span className="vignette-link">Explore experiment ↗</span>
                  </button>
                  {!experimentOpen && (
                    <div className="lab-future-note">
                      <span>+</span> More experiments will join the bench.
                    </div>
                  )}
                </div>
              )}
              <div className="scene-corner corner-tl" />
              <div className="scene-corner corner-br" />
            </div>
            <div className="scene-bottomline">
              <span className="scene-hint">
                <span aria-hidden="true">↖</span>
                {labOpen
                  ? 'Choose an experiment to begin.'
                  : tracking
                    ? 'Move your mouse over the bench.'
                    : 'Pick an object. Follow your curiosity.'}
              </span>
              <div className="scene-controls">
                {!labOpen && (
                  <>
                    <button
                      className="behavior-button"
                      disabled={behaviorDisabled}
                      onClick={() => startBehavior('cube')}
                    >
                      <ObjectIcon kind="work" />
                      Spawn a cube
                    </button>
                    <button
                      className="behavior-button"
                      disabled={behaviorDisabled}
                      onClick={() => startBehavior('dance')}
                    >
                      <DanceIcon />
                      Dance
                    </button>
                    {canTrack && (
                      <button
                        className="behavior-button"
                        disabled={behaviorDisabled}
                        title="Follow your mouse for 10 seconds"
                        onClick={() => startBehavior('track')}
                      >
                        <TrackIcon />
                        Track
                      </button>
                    )}
                  </>
                )}
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
          {labOpen ? (
            experimentOpen ? (
              <RoboticsLab
                close={() => {
                  setLabRequest(null)
                  setExperimentOpen(false)
                  resetLab()
                }}
                request={labRequest}
                snapshot={labSnapshot}
                available={
                  sceneReady &&
                  !sceneFailed &&
                  sceneVisible &&
                  !reducedMotion &&
                  !motionPaused &&
                  !chessOpen
                }
                run={(chunk, delay) => {
                  setLabSnapshot({ ...EMPTY_LAB })
                  setLabRequest((previous) => ({
                    chunk,
                    delay,
                    revision: (previous?.revision ?? 0) + 1,
                  }))
                }}
                moveTarget={() => setLabTargetRevision((previous) => previous + 1)}
                stop={resetLab}
              />
            ) : null
          ) : (
            <ContentPanel {...navigation} select={select} />
          )}
        </div>
        {!labOpen && (
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
        )}
      </main>
      {chessOpen && <ChessPuzzle onClose={() => setChessOpen(false)} />}
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
