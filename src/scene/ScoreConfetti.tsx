import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import type { ArmMotion } from './motion'
import {
  CONFETTI_COLORS,
  CONFETTI_COUNT,
  CONFETTI_DURATION,
  confettiAt,
  createConfetti,
} from './confetti'
import { smooth } from './config'

export default function ScoreConfetti({ motion }: { motion: RefObject<ArmMotion | null> }) {
  const mesh = useRef<InstancedMesh>(null!)
  const material = useRef<MeshStandardMaterial>(null!)
  const pieces = useMemo(() => createConfetti(), [])
  const transform = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    pieces.forEach((_, index) => {
      mesh.current.setColorAt(index, new Color(CONFETTI_COLORS[index % CONFETTI_COLORS.length]))
    })
    mesh.current.instanceColor!.needsUpdate = true
  }, [pieces])

  useFrame(() => {
    const time = motion.current?.confettiTime ?? null
    mesh.current.visible = time !== null
    if (time === null) return
    material.current.opacity = 1 - smooth((time - CONFETTI_DURATION + 0.6) / 0.6)
    pieces.forEach((piece, index) => {
      const state = confettiAt(piece, time)
      transform.position.fromArray(state.position)
      transform.rotation.set(...state.rotation)
      transform.scale.setScalar(state.scale)
      transform.updateMatrix()
      mesh.current.setMatrixAt(index, transform.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CONFETTI_COUNT]}
      visible={false}
      frustumCulled={false}
      raycast={() => null}
    >
      <planeGeometry args={[0.055, 0.028]} />
      <meshStandardMaterial
        ref={material}
        side={DoubleSide}
        roughness={0.95}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
  )
}
