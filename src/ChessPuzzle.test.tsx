import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Chess } from 'chess.js'
import ChessPuzzle, { PUZZLE_FEN } from './ChessPuzzle'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('has exactly one mate-in-one solution, e8=N#', () => {
  const game = new Chess(PUZZLE_FEN)
  const mates = game.moves().filter((move) => {
    const attempt = new Chess(PUZZLE_FEN)
    attempt.move(move)
    return attempt.isCheckmate()
  })
  expect(mates).toEqual(['e8=N#'])
})
function promote(piece: string) {
  fireEvent.click(screen.getByRole('button', { name: 'e7, white pawn' }))
  fireEvent.click(screen.getByRole('button', { name: 'e8, empty, legal destination' }))
  fireEvent.click(screen.getByRole('button', { name: `Promote to ${piece}` }))
}
it('rejects illegal moves and every wrong promotion before accepting knight mate', () => {
  render(<ChessPuzzle onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'e7, white pawn' }))
  fireEvent.click(screen.getByRole('button', { name: 'd2, empty' }))
  expect(screen.getByRole('status').textContent).toContain('not legal')
  for (const piece of ['queen', 'rook', 'bishop']) {
    promote(piece)
    expect(screen.getByRole('status').textContent).toContain('not checkmate')
    expect(screen.getByRole('button', { name: 'e7, white pawn' })).toBeTruthy()
  }
  fireEvent.click(screen.getByRole('button', { name: /Start again/ }))
  expect(screen.getByRole('status').textContent).toContain('Select a white piece')
  promote('knight')
  expect(screen.getByRole('status').textContent).toContain('e8=N# — checkmate!')
  expect(screen.getByRole('button', { name: 'e8, white knight' })).toBeTruthy()
})
it('celebrates, fades, then closes once even when the parent rerenders', () => {
  vi.useFakeTimers()
  const onClose = vi.fn()
  const { rerender } = render(<ChessPuzzle onClose={onClose} />)
  promote('knight')
  expect(screen.getByRole('dialog').classList.contains('is-solved')).toBe(true)
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  const latestClose = vi.fn()
  rerender(<ChessPuzzle onClose={latestClose} />)
  act(() => {
    vi.advanceTimersByTime(800)
  })
  expect(screen.getByRole('dialog').classList.contains('is-closing')).toBe(true)
  expect(latestClose).not.toHaveBeenCalled()
  act(() => {
    vi.advanceTimersByTime(400)
  })
  expect(latestClose).toHaveBeenCalledOnce()
  expect(onClose).not.toHaveBeenCalled()
})
it('cancels the automatic close when the modal is dismissed early', () => {
  vi.useFakeTimers()
  const onClose = vi.fn()
  const { unmount } = render(<ChessPuzzle onClose={onClose} />)
  promote('knight')
  unmount()
  act(() => {
    vi.advanceTimersByTime(3000)
  })
  expect(onClose).not.toHaveBeenCalled()
})
it('supports hints and arrow-key board navigation without wrapping rows', () => {
  render(<ChessPuzzle onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Show hint' }))
  expect(screen.getByText(/Which kind of check/)).toBeTruthy()
  const rook = screen.getByRole('button', { name: 'a1, white queen' })
  rook.focus()
  fireEvent.keyDown(rook, { key: 'ArrowUp' })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'a2, empty' }))
  const edge = screen.getByRole('button', { name: 'a8, empty' })
  edge.focus()
  fireEvent.keyDown(edge, { key: 'ArrowLeft' })
  expect(document.activeElement).toBe(edge)
})
it('isolates Escape from the underlying page and restores focus and scrolling', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  const escape = vi.fn()
  window.addEventListener('keydown', escape)
  const onClose = vi.fn()
  const { unmount } = render(<ChessPuzzle onClose={onClose} />)
  const modal = screen.getByRole('dialog')
  fireEvent.keyDown(modal, { key: 'Escape' })
  expect(escape).not.toHaveBeenCalled()
  fireEvent(modal, new Event('cancel', { bubbles: false, cancelable: true }))
  expect(onClose).toHaveBeenCalledOnce()
  unmount()
  expect(document.activeElement).toBe(trigger)
  expect(document.body.style.overflow).toBe('')
  window.removeEventListener('keydown', escape)
  trigger.remove()
})
