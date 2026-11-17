import { useEffect, useRef } from 'react'
import {
  experimentById,
  type ExperimentFrame,
  type ExperimentId,
  type ExperimentSettings,
} from './experiments'

type Props = {
  id: ExperimentId
  settings: ExperimentSettings
  onSettings: (next: ExperimentSettings) => void
  progress: number
  running: boolean
  frame: ExperimentFrame
  onRun: () => void
  onReset: () => void
  close: () => void
  reducedMotion: boolean
}

export default function IllustrativeLab({
  id,
  settings,
  onSettings,
  progress,
  running,
  frame,
  onRun,
  onReset,
  close,
  reducedMotion,
}: Props) {
  const experiment = experimentById(id)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 760px)').matches)
      heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [id])

  function change(update: Partial<ExperimentSettings>) {
    onSettings({
      ...settings,
      ...update,
      ...(id === 'compliance' && settings.intervention && update.intervention === false
        ? { releaseOffset: frame.tip[0] - frame.target[0] }
        : {}),
      revision: settings.revision + 1,
    })
  }

  return (
    <aside
      id="lab-experiment"
      className="reading-panel is-open lab-panel illustrative-lab"
      aria-label={`${experiment.title} experiment`}
    >
      <div className="panel-scroll">
        <section className="panel-content">
          <div className="lab-lesson-label">
            <span className="eyebrow">EXPERIMENT {experiment.number}</span>
            <h2 className="lab-experiment-heading" ref={heading} tabIndex={-1}>
              {experiment.title}
            </h2>
            <button className="close-button" onClick={close} aria-label="Back to experiments">
              ×
            </button>
          </div>
          <h3 className="lab-question">{experiment.question}</h3>
          <p>{experiment.description}</p>
          <div className="lab-modes" role="group" aria-label="Compare approaches">
            {(['a', 'b'] as const).map((mode, index) => (
              <button
                key={mode}
                aria-pressed={settings.mode === mode}
                onClick={() => change({ mode })}
              >
                {experiment.modes[index]}
              </button>
            ))}
          </div>
          <p className="lab-control-note">Switch approaches to compare the same scene.</p>
          <div className="lab-intervention">
            <button
              className="lab-intervention-button"
              aria-pressed={settings.intervention}
              onClick={() =>
                change({
                  intervention: !settings.intervention,
                  ...(id === 'compliance' && !settings.intervention ? { wasPushed: true } : {}),
                })
              }
            >
              {experiment.intervention[settings.intervention ? 1 : 0]}
            </button>
          </div>
          {experiment.amountLabel && (
            <label className="lab-slider">
              {experiment.amountLabel} <output>{settings.amount}%</output>
              <input
                type="range"
                aria-label={experiment.amountLabel}
                min="0"
                max="100"
                step="5"
                value={settings.amount}
                onChange={(event) => change({ amount: Number(event.target.value) })}
              />
            </label>
          )}
          <div className="lab-actions">
            <button className="lab-run" onClick={onRun}>
              {reducedMotion
                ? 'Show result'
                : running
                  ? 'Restart experiment'
                  : progress >= 1
                    ? 'Run again'
                    : 'Run experiment'}{' '}
              →
            </button>
            <button onClick={onReset}>Reset</button>
          </div>
          {reducedMotion && (
            <p className="lab-note">
              Showing the result without animation. You can still compare approaches and change the
              scene.
            </p>
          )}
          <div className={`lab-monitor experiment-monitor outcome-${frame.outcome}`}>
            <div className="panel-topline">
              <span className="eyebrow">WHAT HAPPENED</span>
              <span>{reducedMotion ? 'Still view' : running ? 'Running' : 'Ready to compare'}</span>
            </div>
            <p className="experiment-status" role="status" aria-atomic="true">
              {frame.status}
            </p>
            <progress
              className="experiment-progress"
              aria-label="Experiment progress"
              value={Math.max(0, Math.min(1, progress))}
              max="1"
            />
            <dl className="lab-metrics">
              {frame.metrics.map((metric) => (
                <div key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="experiment-takeaway">
            <span className="eyebrow">WHAT TO NOTICE</span>
            <p>{experiment.takeaway}</p>
          </div>
          <details>
            <summary>Go deeper: how this experiment works</summary>
            <p>{experiment.detail}</p>
          </details>
          <p className="lab-note">
            An illustrative simulation. Switch approaches and try the same intervention to compare
            their behavior.
          </p>
          <div className="panel-end" aria-hidden="true">
            <span>+</span>
            <span>A question you can try.</span>
            <span>+</span>
          </div>
        </section>
      </div>
    </aside>
  )
}
