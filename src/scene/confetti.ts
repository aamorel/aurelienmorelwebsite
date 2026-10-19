import { smooth, type Point } from './config'
import { palette } from './palette'

export const CONFETTI_COLORS = [
  palette.sage,
  palette.cream,
  palette.clay,
  palette.brass,
  palette.green,
]
export const CONFETTI_COUNT = 72
export const CONFETTI_DURATION = 6.3
export type ConfettiPiece = {
  x: number
  z: number
  start: number
  fall: number
  height: number
  size: number
  spin: number
}

export function clearConfettiSpot(x: number, z: number) {
  return !(
    (Math.abs(x) < 0.88 && z > -1.4 && z < 0.25) ||
    (x < -0.94 && z > 0 && z < 1.4) ||
    (x > 0.85 && x < 2.02 && z > -1.23 && z < -0.08) ||
    (x > 0.18 && x < 1.53 && z > 0.48 && z < 1.52)
  )
}

export function createConfetti(random = Math.random): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, () => {
    let x = -0.5
    let z = 1.4
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidateX = (random() - 0.5) * 4.4
      const candidateZ = (random() - 0.5) * 3.05
      if (clearConfettiSpot(candidateX, candidateZ)) {
        x = candidateX
        z = candidateZ
        break
      }
    }
    return {
      x,
      z,
      start: 0.1 + random() * 2.7,
      fall: 1.8 + random() * 0.5,
      height: 2.65 + random() * 0.45,
      size: 0.7 + random() * 0.6,
      spin: random() * Math.PI * 2,
    }
  })
}

export function confettiAt(piece: ConfettiPiece, time: number) {
  const age = Math.max(0, time - piece.start)
  const progress = Math.min(1, age / piece.fall)
  const flutter = 1 - smooth((progress - 0.8) / 0.2)
  const position: Point = [
    piece.x + Math.sin(age * 5 + piece.spin) * 0.11 * (1 - progress),
    0.014 + piece.height * (1 - progress) ** 1.35,
    piece.z + Math.cos(age * 4 + piece.spin) * 0.08 * (1 - progress),
  ]
  const rotation: Point = [
    -Math.PI / 2 + Math.sin(age * 7 + piece.spin) * flutter,
    Math.cos(age * 5 + piece.spin) * flutter,
    piece.spin + Math.min(age, piece.fall) * 2,
  ]
  const scale = piece.size * smooth(age / 0.12) * (1 - smooth((age - piece.fall - 0.5) / 0.7))
  return { position, rotation, scale }
}
