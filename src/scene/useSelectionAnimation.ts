import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { smooth } from './config'

export type SelectionProps = { selected: boolean; motionEnabled: boolean }

export function useSelectionAnimation(
  { selected, motionEnabled }: SelectionProps,
  apply: (value: number) => void,
) {
  const progress = useRef(selected ? 1 : 0)
  const start = useRef(progress.current)
  const elapsed = useRef(0)
  const applyRef = useRef(apply)
  applyRef.current = apply
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    start.current = progress.current
    elapsed.current = 0
    if (!motionEnabled) progress.current = selected ? 1 : 0
    applyRef.current(progress.current)
    invalidate()
  }, [selected, motionEnabled, invalidate])

  useFrame((_state, delta) => {
    const target = selected ? 1 : 0
    if (!motionEnabled || progress.current === target) return
    elapsed.current += Math.min(delta, 0.06)
    // Let the gripper begin retracting before an object opens underneath it.
    const delay = selected ? 0.2 : 0
    const fraction = smooth((elapsed.current - delay) / 0.55)
    progress.current = start.current + (target - start.current) * fraction
    applyRef.current(progress.current)
  })
}
