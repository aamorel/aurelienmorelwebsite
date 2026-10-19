import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import { hobbies, type Hobby } from '../content'
import HobbyObject from './HobbyObjects'

type Props = { compact: boolean; active: boolean; motionEnabled: boolean; hovered: Hobby | null }

function DisplayItem({
  index,
  kind,
  compact,
  hovered,
  motionEnabled,
}: {
  index: number
  kind: Hobby
  compact: boolean
  hovered: boolean
  motionEnabled: boolean
}) {
  const root = useRef<Group>(null!)
  const item = useRef<Group>(null!)
  const { size, invalidate } = useThree()
  const columns = compact ? 3 : 1
  const rows = compact ? 2 : 5
  const row = compact ? (index > 2 ? 1 : 0) : index
  // Centre the pair in the second row, matching the HTML labels.
  const column = compact ? (row ? index - 3 + 0.5 : index) : 0
  const cellWidth = size.width / columns
  const cellHeight = size.height / rows
  const scale = compact
    ? Math.min(cellWidth * 0.54, 80)
    : Math.min(cellWidth * 0.38, (cellHeight - 24) / 1.7, 56)
  useLayoutEffect(() => {
    root.current.position.set(
      -size.width / 2 + (column + 0.5) * cellWidth,
      size.height / 2 - row * cellHeight - (cellHeight - (compact ? 38 : 22)) / 2,
      0,
    )
    root.current.scale.setScalar(scale)
    invalidate()
  }, [size, column, row, cellWidth, cellHeight, scale, invalidate])
  useEffect(() => {
    invalidate()
  }, [hovered, motionEnabled, invalidate])
  useFrame((_state, delta) => {
    // A demand-rendered scene may have spent seconds at rest before this frame.
    const step = Math.min(delta, 0.05)
    const rotation = hovered && motionEnabled ? 0.28 : 0
    const lift = hovered && motionEnabled ? 0.06 : 0
    item.current.rotation.y = motionEnabled
      ? MathUtils.damp(item.current.rotation.y, rotation, 9, step)
      : 0
    item.current.position.y = motionEnabled
      ? MathUtils.damp(item.current.position.y, lift, 9, step)
      : 0
    if (
      Math.abs(item.current.rotation.y - rotation) + Math.abs(item.current.position.y - lift) >
      0.001
    )
      invalidate()
  })
  return (
    <group ref={root}>
      <group ref={item}>
        <HobbyObject kind={kind} />
      </group>
      <mesh position={[0, -0.76, -0.8]} scale={[0.68, 0.095, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial color="#b4b4a0" transparent opacity={0.17} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.76, -0.79]} scale={[0.46, 0.06, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial color="#a3a791" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ContextMonitor({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault()
      onFailure()
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  return null
}

export default function HobbiesScene(props: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 1000], zoom: 1, near: 0.1, far: 2000 }}
      dpr={[1, props.compact ? 1.25 : 1.5]}
      frameloop={props.active ? 'demand' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      fallback={null}
    >
      <ContextMonitor onFailure={() => setFailed(true)} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-250, 400, 400]} intensity={2.6} color="#fff4df" />
      <directionalLight position={[300, 150, -150]} intensity={1.4} color="#e9efdc" />
      {hobbies.map((hobby, index) => (
        <DisplayItem
          key={hobby.id}
          index={index}
          kind={hobby.id}
          compact={props.compact}
          hovered={props.hovered === hobby.id}
          motionEnabled={props.motionEnabled}
        />
      ))}
    </Canvas>
  )
}
