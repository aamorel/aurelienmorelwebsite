import { describe, expect, it } from 'vitest'
import { CONFETTI_DURATION, confettiAt, createConfetti, clearConfettiSpot } from './confetti'

// Reproducible scatter, including the bounded retry path for occupied spots.
let seed = 7
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

describe('basket celebration confetti', () => {
  it.each([random, () => 0.5])(
    'lands flat on clear parts of the bench and disappears',
    (random) => {
      for (const piece of createConfetti(random)) {
        expect(confettiAt(piece, 0).scale).toBe(0)
        let previousHeight = Infinity
        for (let time = piece.start; time < piece.start + piece.fall; time += 0.05) {
          const { position } = confettiAt(piece, time)
          expect(position[1]).toBeLessThanOrEqual(previousHeight)
          expect(Math.abs(position[0])).toBeLessThan(2.4)
          expect(Math.abs(position[2])).toBeLessThan(1.7)
          expect(position[1]).toBeGreaterThanOrEqual(0.014)
          previousHeight = position[1]
        }
        const settled = confettiAt(piece, piece.start + piece.fall + 0.1)
        expect(settled.position).toEqual([piece.x, 0.014, piece.z])
        expect(clearConfettiSpot(piece.x, piece.z)).toBe(true)
        expect(settled.rotation[0]).toBeCloseTo(-Math.PI / 2, 8)
        expect(settled.rotation[1]).toBeCloseTo(0, 8)
        expect(settled.scale).toBeGreaterThan(0)
        expect(confettiAt(piece, CONFETTI_DURATION).scale).toBeCloseTo(0, 8)
      }
    },
  )
})
