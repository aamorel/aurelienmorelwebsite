import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { ARM, smooth } from './config'
import { DANCE_DURATION } from './danceRoutine'
import type { ArmMotion } from './motion'
import { palette } from './palette'

const RADIUS = 0.32
const TILE_COLORS = [palette.cream, palette.paint, palette.paper, palette.sage, palette.brass]
const tiles = Array.from({ length: 14 }, (_, row) => {
  const latitude = ((row + 0.5) * Math.PI) / 14
  const count = Math.max(6, Math.round(28 * Math.sin(latitude)))
  return Array.from({ length: count }, (_, column) => ({
    latitude,
    longitude: (column * Math.PI * 2) / count,
    width: ((Math.PI * 2 * RADIUS * Math.sin(latitude)) / count) * 0.88,
    height: ((Math.PI * RADIUS) / 14) * 0.88,
    color: TILE_COLORS[(row * 3 + column) % TILE_COLORS.length],
  }))
}).flat()

export default function DiscoBall({
  motion,
  motionEnabled,
}: {
  motion: RefObject<ArmMotion | null>
  motionEnabled: boolean
}) {
  const group = useRef<Group>(null!)
  const globe = useRef<Group>(null!)
  const mirrors = useRef<InstancedMesh>(null!)
  const mirrorMaterial = useRef<MeshStandardMaterial>(null!)
  const coreMaterial = useRef<MeshStandardMaterial>(null!)
  const cordMaterial = useRef<MeshStandardMaterial>(null!)

  useLayoutEffect(() => {
    const tile = new Object3D()
    tiles.forEach(({ latitude, longitude, width, height, color }, index) => {
      tile.position.set(
        RADIUS * Math.sin(latitude) * Math.cos(longitude),
        RADIUS * Math.cos(latitude),
        RADIUS * Math.sin(latitude) * Math.sin(longitude),
      )
      tile.lookAt(tile.position.clone().multiplyScalar(2))
      tile.scale.set(width, height, 1)
      tile.updateMatrix()
      mirrors.current.setMatrixAt(index, tile.matrix)
      mirrors.current.setColorAt(index, new Color(color))
    })
    mirrors.current.instanceMatrix.needsUpdate = true
    mirrors.current.instanceColor!.needsUpdate = true
  }, [])

  useFrame(() => {
    const time = motionEnabled ? (motion.current?.danceTime ?? null) : null
    group.current.visible = time !== null
    if (time === null) return
    const reveal = smooth(Math.min(time, DANCE_DURATION - time) / 0.55)
    group.current.position.y = 2.72 + 0.08 * (1 - reveal)
    globe.current.rotation.y = time * 0.7
    for (const material of [mirrorMaterial.current, coreMaterial.current, cordMaterial.current]) {
      material.opacity = reveal
      material.depthWrite = reveal === 1
    }
  })

  return (
    <group ref={group} visible={false} position={[ARM.base[0], 2.72, ARM.base[2]]}>
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.28, 8]} />
        <meshStandardMaterial ref={cordMaterial} color={palette.sage} roughness={0.7} transparent />
      </mesh>
      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[RADIUS - 0.005, 28, 14]} />
          <meshStandardMaterial
            ref={coreMaterial}
            color={palette.dark}
            roughness={0.6}
            transparent
          />
        </mesh>
        <instancedMesh ref={mirrors} args={[undefined, undefined, tiles.length]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            ref={mirrorMaterial}
            metalness={0.65}
            roughness={0.27}
            transparent
          />
        </instancedMesh>
      </group>
    </group>
  )
}
