import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  vi.restoreAllMocks()
})

it('has exactly one mate-in-one solution, Re8#', () => {
  const game = new Chess(PUZZLE_FEN)
  const mates = game.moves().filter((move) => {
    const attempt = new Chess(PUZZLE_FEN)
    attempt.move(move)
    return attempt.isCheckmate()
  })
  expect(mates).toEqual(['Re8#'])
})
it('rejects illegal and non-mating moves, accepts checkmate, and resets', () => {
  render(<ChessPuzzle onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'e1, white rook' }))
  fireEvent.click(screen.getByRole('button', { name: 'd2, empty' }))
  expect(screen.getByRole('status').textContent).toContain('not legal')
  fireEvent.click(screen.getByRole('button', { name: 'e2, empty, legal destination' }))
  expect(screen.getByRole('status').textContent).toContain('not checkmate')
  fireEvent.click(screen.getByRole('button', { name: 'e8, empty, legal destination' }))
  expect(screen.getByRole('status').textContent).toContain('Re8# — checkmate!')
  fireEvent.click(screen.getByRole('button', { name: /Start again/ }))
  expect(screen.getByRole('button', { name: 'e1, white rook' })).toBeTruthy()
})
it('supports hints and arrow-key board navigation without wrapping rows', () => {
  render(<ChessPuzzle onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Show hint' }))
  expect(screen.getByText(/boxed in by its pawns/)).toBeTruthy()
  const rook = screen.getByRole('button', { name: 'e1, white rook' })
  rook.focus()
  fireEvent.keyDown(rook, { key: 'ArrowUp' })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'e2, empty' }))
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
