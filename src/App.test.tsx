import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { ArmPhase, BehaviorRequest } from './scene/motion'

type SceneControls = {
  behaviorRequest: BehaviorRequest | null
  onReady: () => void
  onPhaseChange: (phase: ArmPhase) => void
}
const scene = vi.hoisted(() => ({
  fail: false,
  reduced: false,
  props: null as SceneControls | null,
}))
vi.mock('./scene/WorkbenchScene', () => ({
  default: (props: SceneControls) => {
    scene.props = props
    if (scene.fail) throw new Error('WebGL unavailable')
    return <div data-testid="scene">Scene placeholder</div>
  },
}))

beforeEach(() => {
  scene.fail = false
  scene.reduced = false
  scene.props = null
  window.history.replaceState(null, '', '/')
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return scene.reduced
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('accessible HTML shell', () => {
  it.each([
    { name: 'Spawn a cube', kind: 'cube', caption: 'MAKING ROOM' },
    { name: 'Dance', kind: 'dance', caption: 'FEELING THE GROOVE' },
  ])(
    'runs $name with an open panel and disables both behavior buttons',
    async ({ name, kind, caption }) => {
      window.history.replaceState(null, '', '/#education')
      render(<App />)
      const spawn = screen.getByRole('button', { name }) as HTMLButtonElement
      const other = screen.getByRole('button', {
        name: kind === 'cube' ? 'Dance' : 'Spawn a cube',
      }) as HTMLButtonElement
      expect(spawn.disabled).toBe(true)
      expect(other.disabled).toBe(true)
      await screen.findByTestId('scene')
      act(() => scene.props!.onReady())
      expect(spawn.disabled).toBe(false)
      expect(other.disabled).toBe(false)
      fireEvent.click(spawn)
      expect(scene.props!.behaviorRequest?.revision).toBe(1)
      expect(spawn.disabled).toBe(true)
      expect(other.disabled).toBe(true)
      expect(screen.getByText(caption)).toBeTruthy()
      expect(scene.props!.behaviorRequest?.kind).toBe(kind)
      fireEvent.click(other)
      fireEvent.click(spawn)
      expect(scene.props!.behaviorRequest?.revision).toBe(1)
      expect(screen.getByRole('heading', { name: 'Where it started.' })).toBeTruthy()
      act(() => scene.props!.onPhaseChange('idle'))
      expect(spawn.disabled).toBe(false)
      expect(other.disabled).toBe(false)
      expect(screen.getByText('TAKE YOUR TIME')).toBeTruthy()
      act(() => scene.props!.onPhaseChange('returning'))
      expect(spawn.disabled).toBe(true)
      expect(other.disabled).toBe(true)
      act(() => scene.props!.onPhaseChange('idle'))
      fireEvent.click(screen.getByRole('button', { name: 'Pause robot motion' }))
      expect(spawn.disabled).toBe(true)
      expect(other.disabled).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: 'Resume robot motion' }))
      expect(spawn.disabled).toBe(false)
      expect(other.disabled).toBe(false)
    },
  )

  it('keeps the drawer out of navigation until selection and makes it inert on close', async () => {
    render(<App />)
    const canvas = await screen.findByTestId('scene')
    expect(screen.queryByRole('complementary', { name: 'Workbench content' })).toBeNull()
    const education = within(screen.getByRole('navigation')).getByRole('link', {
      name: 'Education',
    })
    fireEvent.click(education)
    expect(screen.getByRole('complementary', { name: 'Workbench content' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close section' }))
    expect(screen.queryByRole('complementary', { name: 'Workbench content' })).toBeNull()
    expect(screen.getByRole('complementary', { hidden: true }).hasAttribute('inert')).toBe(true)
    expect(document.activeElement).toBe(education)
    expect(screen.getByTestId('scene')).toBe(canvas)
  })

  it('keeps navigation usable after the 3D scene fails', async () => {
    scene.fail = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)
    await screen.findByText('You can still explore everything using the links.')
    expect(
      (screen.getByRole('button', { name: 'Spawn a cube' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect((screen.getByRole('button', { name: 'Dance' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Work' }))
    expect(screen.getByRole('heading', { name: 'What I bring back.' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'What I bring back.' }))
  })

  it('opens direct-link content even before the lazy scene is available', async () => {
    window.history.replaceState(null, '', '/#education')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Where it started.' })).toBeTruthy()
    await screen.findByTestId('scene')
    expect(screen.getByRole('heading', { name: 'Where it started.' })).toBeTruthy()
  })

  it('honors reduced motion and restores focus on keyboard close', async () => {
    scene.reduced = true
    render(<App />)
    expect(
      (screen.getByRole('button', { name: 'Spawn a cube' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect((screen.getByRole('button', { name: 'Dance' }) as HTMLButtonElement).disabled).toBe(true)
    const navigation = screen.getByRole('navigation')
    const publications = within(navigation).getByRole('link', { name: 'Publications' })
    fireEvent.click(publications)
    const heading = screen.getByRole('heading', { name: 'Research, in practice.' })
    expect(document.activeElement).toBe(heading)
    expect(
      (
        screen.getByRole('button', {
          name: 'Motion disabled by system preference',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.activeElement).toBe(publications)
    await screen.findByTestId('scene')
  })

  it('keeps the scene mounted across section switches and history updates', async () => {
    render(<App />)
    const canvas = await screen.findByTestId('scene')
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Education' }))
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Work' }))
    expect(screen.getByTestId('scene')).toBe(canvas)
    act(() => {
      window.history.replaceState(null, '', '/#publications')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Research, in practice.' })).toBeTruthy(),
    )
    expect(screen.getByTestId('scene')).toBe(canvas)
  })
})
