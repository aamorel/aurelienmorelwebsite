import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import IllustrativeLab from './IllustrativeLab'
import {
  INITIAL_EXPERIMENT_SETTINGS,
  experimentById,
  type ExperimentFrame,
  type ExperimentId,
  type ExperimentSettings,
} from './experiments'

const frame: ExperimentFrame = {
  path: [],
  ghostPaths: [],
  tip: [25, 45],
  object: [25, 45],
  target: [78, 25],
  obstacle: null,
  status: 'The cube reached the ring.',
  outcome: 'success',
  metrics: [{ label: 'Distance remaining', value: '0 cm' }],
}

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPanel(
  id: ExperimentId,
  options: { reducedMotion?: boolean; progress?: number; running?: boolean } = {},
) {
  const onSettings = vi.fn()
  const onRun = vi.fn()
  const onReset = vi.fn()
  const close = vi.fn()
  function Harness() {
    const [settings, setSettings] = useState<ExperimentSettings>({
      ...INITIAL_EXPERIMENT_SETTINGS,
    })
    return (
      <IllustrativeLab
        id={id}
        settings={settings}
        onSettings={(next) => {
          onSettings(next)
          setSettings(next)
        }}
        frame={frame}
        progress={options.progress ?? 0}
        running={options.running ?? false}
        reducedMotion={options.reducedMotion ?? false}
        onRun={onRun}
        onReset={onReset}
        close={close}
      />
    )
  }
  const view = render(<Harness />)
  return { ...view, onSettings, onRun, onReset, close }
}

it('switches approaches and interventions while preserving the scene and incrementing revisions', () => {
  const { onSettings } = renderPanel('planning', { running: true })
  expect(screen.getByRole('button', { name: 'Direct motion' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Plan a route' }))
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    mode: 'b',
    revision: 1,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add obstacle' }))
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    mode: 'b',
    intervention: true,
    revision: 2,
  })
  expect(screen.getByRole('button', { name: 'Remove obstacle' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Remove obstacle' }))
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    mode: 'b',
    intervention: false,
    revision: 3,
  })
})

it('keeps compliance push history on release and applies the requested push strength', () => {
  const { onSettings } = renderPanel('compliance')
  fireEvent.click(screen.getByRole('button', { name: 'Push the arm' }))
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    intervention: true,
    wasPushed: true,
    revision: 1,
  })
  fireEvent.change(screen.getByRole('slider', { name: /Push strength/ }), {
    target: { value: '85' },
  })
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    amount: 85,
    intervention: true,
    wasPushed: true,
    revision: 2,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Release the arm' }))
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    amount: 85,
    intervention: false,
    wasPushed: true,
    releaseOffset: frame.tip[0] - frame.target[0],
    revision: 3,
  })
  expect(screen.getByRole('button', { name: 'Push the arm' }).getAttribute('aria-pressed')).toBe(
    'false',
  )
})

it('provides replay, reset, and return actions after a completed experiment', () => {
  const { onRun, onReset, close } = renderPanel('reward', { progress: 1 })
  fireEvent.click(screen.getByRole('button', { name: /Run again/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back to experiments' }))
  expect(onRun).toHaveBeenCalledOnce()
  expect(onReset).toHaveBeenCalledOnce()
  expect(close).toHaveBeenCalledOnce()
  expect(screen.getByRole('status').textContent).toBe(frame.status)
  expect(screen.getByText('Distance remaining')).toBeTruthy()
  expect(screen.getByText('0 cm')).toBeTruthy()
  expect((screen.getByRole('progressbar') as HTMLProgressElement).value).toBe(1)
})

it('keeps reduced-motion comparison controls usable and exposes the model explanation', () => {
  const { onSettings, onRun } = renderPanel('perception', {
    reducedMotion: true,
    progress: 1,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Look again' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide & move cube' }))
  fireEvent.click(screen.getByRole('button', { name: /Show result/ }))
  expect(onSettings).toHaveBeenLastCalledWith({
    ...INITIAL_EXPERIMENT_SETTINGS,
    mode: 'b',
    intervention: true,
    revision: 2,
  })
  expect(onRun).toHaveBeenCalledOnce()
  expect(screen.getByText(/Showing the result without animation/)).toBeTruthy()
  const summary = screen.getByText('Go deeper: how this experiment works')
  const details = summary.closest('details')!
  expect(details.open).toBe(false)
  fireEvent.click(summary)
  expect(details.open).toBe(true)
  expect(screen.getByText(experimentById('perception').detail)).toBeTruthy()
})

it('does not steal focus back from a control when experiment settings change', () => {
  renderPanel('grasps')
  const heading = screen.getByRole('heading', { name: 'Another way to hold it' })
  expect(document.activeElement).toBe(heading)
  const alternatives = screen.getByRole('button', { name: 'Keep alternatives' })
  alternatives.focus()
  fireEvent.click(alternatives)
  expect(document.activeElement).toBe(alternatives)
  expect(alternatives.getAttribute('aria-pressed')).toBe('true')
})
