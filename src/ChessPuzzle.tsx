import { useEffect, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'

export const PUZZLE_FEN = '8/b3Ppp1/2n1pkp1/6p1/1B2K3/8/1r6/Q7 w - - 0 1'
const names = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
const glyphs = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const squares = Array.from(
  { length: 64 },
  (_, i) => `${'abcdefgh'[i % 8]}${8 - Math.floor(i / 8)}` as Square,
)

export default function ChessPuzzle({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [game, setGame] = useState(() => new Chess(PUZZLE_FEN))
  const [selected, setSelected] = useState<Square | null>(null)
  const [focused, setFocused] = useState<Square>('a1')
  const [promotion, setPromotion] = useState<Square | null>(null)
  const [closing, setClosing] = useState(false)
  const closeCallback = useRef(onClose)
  useEffect(() => {
    closeCallback.current = onClose
  }, [onClose])
  const [hint, setHint] = useState(false)
  const [message, setMessage] = useState('Select a white piece, then its destination.')
  const solved = game.isCheckmate()
  const legal = selected
    ? game.moves({ square: selected, verbose: true }).map((move) => move.to)
    : []
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [])
  useEffect(() => {
    if (!solved) return
    const fade = window.setTimeout(() => setClosing(true), 1800)
    const close = window.setTimeout(() => closeCallback.current(), 2200)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(close)
    }
  }, [solved])
  function attemptMove(square: Square, promoteTo?: 'q' | 'r' | 'b' | 'n') {
    if (!selected) return
    const attempt = new Chess(game.fen())
    const move = attempt.move({ from: selected, to: square, promotion: promoteTo })
    setPromotion(null)
    if (attempt.isCheckmate()) {
      setGame(attempt)
      setSelected(null)
      setHint(false)
      setMessage(`${move.san} — checkmate! Brilliantly spotted.`)
    } else {
      setMessage('A legal move, but not checkmate. Try again!')
    }
  }
  function choose(square: Square) {
    if (solved) return
    setPromotion(null)
    if (game.get(square)?.color === 'w') {
      setSelected(square)
      setMessage(`Choose a destination for your ${names[game.get(square)!.type]}.`)
      return
    }
    if (!selected) return
    if (!legal.includes(square)) {
      setMessage('That move is not legal. Try one of the marked squares.')
      return
    }
    if (
      game
        .moves({ square: selected, verbose: true })
        .some((move) => move.to === square && move.promotion)
    ) {
      setPromotion(square)
      setMessage('Choose the piece to promote to.')
      return
    }
    attemptMove(square)
  }

  return (
    <dialog
      ref={dialog}
      className={`chess-modal ${solved ? 'is-solved' : ''} ${closing ? 'is-closing' : ''}`}
      aria-labelledby="chess-title"
      aria-describedby="chess-description"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose()
        }
      }}
    >
      <div className="chess-modal-top">
        <span className="eyebrow">A SMALL DETOUR</span>
        <button onClick={onClose} aria-label="Close chess puzzle">
          ×
        </button>
      </div>
      <h2 id="chess-title">Your move.</h2>
      <p id="chess-description">White to move. Find checkmate in one.</p>
      <div
        className="chess-board"
        role="group"
        aria-label="Chessboard. Use arrow keys to move between squares; Enter to select."
      >
        {squares.map((square, index) => {
          const piece = game.get(square)
          return (
            <button
              key={square}
              type="button"
              tabIndex={focused === square ? 0 : -1}
              onFocus={() => setFocused(square)}
              aria-label={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${names[piece.type]}` : ', empty'}${legal.includes(square) ? ', legal destination' : ''}`}
              aria-pressed={selected === square}
              className={`chess-square ${(Math.floor(index / 8) + (index % 8)) % 2 ? 'dark' : 'light'} ${selected === square ? 'selected' : ''} ${legal.includes(square) ? 'legal' : ''}`}
              onClick={() => choose(square)}
              onKeyDown={(event) => {
                const offsets: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -8,
                  ArrowDown: 8,
                }
                const offset = offsets[event.key]
                if (!offset) return
                event.preventDefault()
                const next = index + offset
                if (
                  next < 0 ||
                  next >= 64 ||
                  (Math.abs(offset) === 1 && Math.floor(next / 8) !== Math.floor(index / 8))
                )
                  return
                const buttons = event.currentTarget.parentElement!.querySelectorAll('button')
                buttons[next].focus()
              }}
            >
              {piece && (
                <span
                  aria-hidden="true"
                  className={`chess-piece ${piece.color === 'w' ? 'white' : 'black'}`}
                >
                  {glyphs[piece.type]}
                </span>
              )}
              {index % 8 === 0 && (
                <span aria-hidden="true" className="chess-rank">
                  {square[1]}
                </span>
              )}
              {index >= 56 && (
                <span aria-hidden="true" className="chess-file">
                  {square[0]}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {solved && (
        <div className="chess-celebration" aria-hidden="true">
          ✧ <span>Beautifully played.</span> ✧
        </div>
      )}
      {promotion && (
        <div className="chess-promotion" role="group" aria-label="Choose promotion piece">
          {(['q', 'r', 'b', 'n'] as const).map((piece) => (
            <button
              key={piece}
              onClick={() => attemptMove(promotion, piece)}
              aria-label={`Promote to ${names[piece]}`}
            >
              <span aria-hidden="true">{glyphs[piece]}</span>
              {names[piece]}
            </button>
          ))}
        </div>
      )}
      <p className={`chess-feedback ${solved ? 'solved' : ''}`} role="status">
        {message}
      </p>
      {hint && (
        <p className="chess-hint">
          Look beyond the strongest piece. Which kind of check cannot be blocked?
        </p>
      )}
      <div className="chess-actions">
        <button disabled={solved} onClick={() => setHint(!hint)} aria-expanded={hint}>
          {hint ? 'Hide hint' : 'Show hint'}
        </button>
        <button
          disabled={solved}
          onClick={() => {
            setPromotion(null)
            setGame(new Chess(PUZZLE_FEN))
            setSelected(null)
            setHint(false)
            setMessage('Select a white piece, then its destination.')
          }}
        >
          Start again ↺
        </button>
      </div>
    </dialog>
  )
}
