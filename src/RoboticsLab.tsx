import { useEffect, useRef, useState } from 'react'
import { EMPTY_LAB, LAB_STEPS, LAB_STEP_TIME, type LabRequest, type LabSnapshot } from './lab'

type Props = {
  close: () => void
  request: LabRequest | null
  snapshot: LabSnapshot
  run: (chunk: number, delay: number) => void
  moveTarget: () => void
  available: boolean
  stop: () => void
}

export default function RoboticsLab({
  close,
  request,
  snapshot,
  run,
  moveTarget,
  available,
  stop,
}: Props) {
  const [chunk, setChunk] = useState(6)
  const [delay, setDelay] = useState(400)
  const [single, setSingle] = useState(false)
  const [results, setResults] = useState<Record<string, { elapsed: number; calls: number }>>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const s = request ? snapshot : EMPTY_LAB
  const running = !!request && !s.finished
  const execution = single ? 1 : chunk
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 760px)').matches)
      heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [])
  useEffect(() => {
    if (request && snapshot.finished)
      setResults((previous) => ({
        ...previous,
        [`${request.chunk}:${request.delay}`]: { elapsed: snapshot.elapsed, calls: snapshot.calls },
      }))
  }, [request, snapshot.finished, snapshot.elapsed, snapshot.calls])
  return (
    <aside
      id="lab-experiment"
      className="reading-panel is-open lab-panel"
      aria-label="Robotics lab"
    >
      <div className="panel-scroll">
        <section className="panel-content">
          <div className="lab-lesson-label">
            <span className="eyebrow">EXPERIMENT 01</span>
            <h2 className="lab-experiment-heading" ref={heading} tabIndex={-1}>
              Action chunking
            </h2>
            <button className="close-button" onClick={close} aria-label="Back to experiments">
              ×
            </button>
          </div>
          <h3 className="lab-question">Why predict several actions at once?</h3>
          <p>
            A robot can predict one next action, or a sequence of future actions. Watch the same arm
            move a cube onto the green ring, then compare how often it has to stop and think.
          </p>
          <div className="lab-modes" role="group" aria-label="Prediction mode">
            <button aria-pressed={single} disabled={running} onClick={() => setSingle(true)}>
              Single action
            </button>
            <button aria-pressed={!single} disabled={running} onClick={() => setSingle(false)}>
              Action chunk
            </button>
          </div>
          <label className="lab-slider">
            Actions per prediction <output>{execution}</output>
            <input
              type="range"
              min="2"
              max="12"
              value={chunk}
              disabled={single || running}
              onChange={(e) => setChunk(Number(e.target.value))}
            />
          </label>
          <label className="lab-slider">
            Simulated inference delay <output>{delay} ms</output>
            <input
              type="range"
              min="0"
              max="1000"
              step="100"
              value={delay}
              disabled={running}
              onChange={(e) => setDelay(Number(e.target.value))}
            />
          </label>
          <div className="lab-actions">
            <button
              className="lab-run"
              disabled={!available || running}
              onClick={() => run(execution, delay)}
            >
              {s.finished ? 'Run again' : 'Run experiment'} →
            </button>
            {running && <button onClick={stop}>Reset</button>}
            <button disabled={!running || s.step >= 19} onClick={moveTarget}>
              Move target
            </button>
          </div>
          {!available && (
            <p className="lab-note">
              Enable motion and keep the workbench visible to run the experiment. The explanation
              and timeline remain available without 3D.
            </p>
          )}
          <div className="lab-monitor">
            <div className="panel-topline">
              <span className="eyebrow">ACTION TIMELINE</span>
              <span role="status">
                {!request
                  ? 'Ready to predict'
                  : s.finished
                    ? 'Run complete'
                    : s.waiting
                      ? 'Observing · predicting…'
                      : `Executing action ${s.step + 1}`}
              </span>
            </div>
            <div
              className="lab-timeline"
              aria-label={`${s.step} of ${LAB_STEPS} actions executed; ${s.predicted} predicted`}
            >
              {Array.from({ length: LAB_STEPS }, (_, i) => (
                <span
                  key={i}
                  className={`${i < s.step ? 'executed' : i < s.predicted ? 'predicted' : ''} ${request && i % request.chunk === 0 ? 'observation' : ''}`}
                />
              ))}
            </div>
            <div className="lab-legend">
              <span>● Executed</span>
              <span>○ Predicted</span>
              <span>│ Observation / call</span>
            </div>
            <dl className="lab-metrics">
              <div>
                <dt>Inference calls</dt>
                <dd>{s.calls}</dd>
              </div>
              <div>
                <dt>Elapsed</dt>
                <dd>{s.elapsed.toFixed(1)} s</dd>
              </div>
              <div>
                <dt>Executed</dt>
                <dd>
                  {s.step} / {LAB_STEPS}
                </dd>
              </div>
            </dl>
            {request && s.target !== s.observedTarget && !s.finished && (
              <p>The target moved. The queued actions still use the previous observation.</p>
            )}
            {s.finished && (
              <p>
                {s.placedTarget === s.target
                  ? 'Cube delivered to the current target.'
                  : 'The cube reached the old target: the change arrived too late for the placement actions.'}{' '}
                Try the other mode with the same delay.
              </p>
            )}
          </div>
          <div className="lab-comparison">
            <span className="eyebrow">YOUR RUNS · {delay} MS DELAY</span>
            {[1, chunk].map((k) => (
              <div key={k}>
                <span>{k === 1 ? 'Single action' : `${k}-action chunks`}</span>
                <strong>
                  {results[`${k}:${delay}`]
                    ? `${results[`${k}:${delay}`].elapsed.toFixed(1)} s · ${results[`${k}:${delay}`].calls} calls`
                    : 'Run to compare'}
                </strong>
              </div>
            ))}
          </div>
          <h3>What to notice</h3>
          <p>
            Larger chunks amortize the cost of inference over more actions. But executing a whole
            chunk before observing again makes the controller slower to react. Move the ring during
            a run to see the stale plan in action.
          </p>
          <details>
            <summary>Go deeper: prediction vs. execution</summary>
            <p>
              A prediction horizon is how many future actions a policy outputs. An execution horizon
              is how many it performs before replanning. They need not be equal. This experiment
              sets both to the chunk size.
            </p>
            <p>
              Here each action lasts {LAB_STEP_TIME * 1000} ms, inference blocks execution, and a
              full run has {LAB_STEPS} actions. With a stationary target, total time is
              approximately 5.28 s + ceil(24 / chunk size) × inference delay. Asynchronous inference
              can overlap computation and motion.
            </p>
            <p>
              ACT also uses temporal ensembling to combine overlapping predictions. This demo does
              not implement that, model training, perception, or realistic dynamics: its joint
              targets are authored and the delay is simulated.
            </p>
            <a href="https://arxiv.org/abs/2304.13705" target="_blank" rel="noreferrer">
              Read the ACT / ALOHA paper ↗
            </a>
          </details>
          <p className="lab-note">
            An illustrative controller simulation on this workbench’s arm. The target is observed
            only at prediction calls; the cube is released once, so later observations cannot undo a
            placement.
          </p>
          <div className="panel-end">
            <span>+</span>
            <span>More questions, more experiments to come.</span>
            <span>+</span>
          </div>
        </section>
      </div>
    </aside>
  )
}
