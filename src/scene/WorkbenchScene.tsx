import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Line, RoundedBox } from '@react-three/drei'
import { Group, MeshStandardMaterial, OrthographicCamera, Vector3 } from 'three'
import { sections, type Section } from '../content'
import { ArrowIcon, CheckIcon } from '../Icons'
import type { Mode } from '../useNavigation'
import RobotArm from './RobotArm'
import type { ArmPhase, BehaviorRequest } from './motion'
import { TARGETS } from './config'
import { palette } from './palette'
import { useSelectionAnimation, type SelectionProps } from './useSelectionAnimation'

const wood = new MeshStandardMaterial({ color: '#c99e70', roughness: 0.85 })
const paper = new MeshStandardMaterial({ color: palette.paper, roughness: 0.95 })
const sage = new MeshStandardMaterial({ color: palette.sage, roughness: 0.8 })
const graphite = new MeshStandardMaterial({ color: palette.dark, roughness: 0.65, metalness: 0.15 })
const orange = new MeshStandardMaterial({ color: palette.clay, roughness: 0.6 })

type Props = {
  selected: Section | null
  mode: Mode
  revision: number
  hovered: Section | null
  setHovered: (id: Section | null) => void
  select: (id: Section, origin?: HTMLElement | null) => void
  motionEnabled: boolean
  active: boolean
  onReady: () => void
  onFailure: () => void
  behaviorRequest: BehaviorRequest | null
  onPhaseChange: (phase: ArmPhase) => void
  trackEnabled: boolean
  onTrackTimeChange: (seconds: number) => void
}

function CameraRig() {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const orthographic = camera as OrthographicCamera
    orthographic.position.set(4.8, 6.4, 8.8)
    orthographic.lookAt(new Vector3(-0.25, 0.75, 0))
    orthographic.zoom = Math.min(size.width / 7.4, size.height / 5.2)
    orthographic.updateProjectionMatrix()
    invalidate()
  }, [camera, size, invalidate])
  return null
}

function Desk() {
  return (
    <group dispose={null}>
      <RoundedBox
        args={[5, 0.3, 3.65]}
        radius={0.14}
        smoothness={5}
        position={[0, -0.15, 0]}
        material={wood}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[4.95, 0.035, 3.6]}
        radius={0.017}
        smoothness={3}
        position={[0, -0.22, 0]}
        castShadow
      >
        <meshStandardMaterial color="#ac8059" roughness={0.9} />
      </RoundedBox>
      {Array.from({ length: 19 }, (_, index) => {
        const z = -1.64 + index * 0.18
        return (
          <Line
            key={index}
            points={[
              [-2.34, 0.003, z],
              [-1.4, 0.003, z + 0.012],
              [0, 0.003, z + 0.008],
              [1.2, 0.003, z + 0.02],
              [2.34, 0.003, z + 0.005],
            ]}
            color="#a77f52"
            lineWidth={0.5}
            transparent
            opacity={0.18}
          />
        )
      })}
      <RoundedBox
        args={[1.55, 0.018, 1.47]}
        radius={0.008}
        smoothness={2}
        position={[0, 0.015, -0.58]}
        receiveShadow
      >
        <meshStandardMaterial color="#a8af91" roughness={1} />
      </RoundedBox>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i}>
          <Line
            points={[
              [-0.7 + i * 0.23, 0.025, -1.23],
              [-0.7 + i * 0.23, 0.025, 0.07],
            ]}
            color="#d2d7bc"
            lineWidth={0.4}
            transparent
            opacity={0.5}
          />
          <Line
            points={[
              [-0.7, 0.025, -1.23 + i * 0.21],
              [0.7, 0.025, -1.23 + i * 0.21],
            ]}
            color="#d2d7bc"
            lineWidth={0.4}
            transparent
            opacity={0.5}
          />
        </group>
      ))}
      {[
        [-2.25, -1.57],
        [2.25, -1.57],
        [-2.25, 1.57],
        [2.25, 1.57],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.023, 12]} />
          <meshStandardMaterial color="#9d7850" />
        </mesh>
      ))}
      <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.16} />
      </mesh>
    </group>
  )
}

function Notebook(props: SelectionProps) {
  const cover = useRef<Group>(null!)
  useSelectionAnimation(props, (value) => {
    cover.current.rotation.z = value * 2.15
  })
  return (
    <group rotation={[0, TARGETS.education.rotation, 0]}>
      <RoundedBox
        args={[0.78, 0.16, 1.02]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.1, 0]}
        material={paper}
        castShadow
        receiveShadow
      />
      <group ref={cover} position={[-0.39, 0.2, 0]}>
        <RoundedBox
          args={[0.83, 0.035, 1.07]}
          radius={0.015}
          smoothness={3}
          position={[0.39, 0, 0]}
          material={sage}
          castShadow
        />
        <mesh position={[0.39, -0.023, 0]} material={paper}>
          <boxGeometry args={[0.67, 0.008, 0.9]} />
        </mesh>
        <mesh position={[0.66, 0.021, 0]} material={graphite}>
          <boxGeometry args={[0.032, 0.009, 1.07]} />
        </mesh>
        <mesh position={[0.33, 0.021, -0.17]} material={paper}>
          <boxGeometry args={[0.34, 0.008, 0.24]} />
        </mesh>
        <Line
          points={[
            [0.22, 0.028, -0.19],
            [0.44, 0.028, -0.19],
          ]}
          color="#8c967c"
          lineWidth={1}
        />
        <Line
          points={[
            [0.22, 0.028, -0.14],
            [0.37, 0.028, -0.14],
          ]}
          color="#8c967c"
          lineWidth={0.6}
        />
      </group>
      <RoundedBox
        args={[0.83, 0.035, 1.07]}
        radius={0.015}
        smoothness={3}
        position={[0, 0.025, 0]}
        material={sage}
      />
      <RoundedBox
        args={[0.075, 0.2, 1.07]}
        radius={0.025}
        smoothness={3}
        position={[-0.38, 0.115, 0]}
        material={sage}
        castShadow
      />
      {Array.from({ length: 7 }, (_, index) => (
        <Line
          key={index}
          points={[
            [-0.24, 0.183, -0.3 + index * 0.09],
            [index === 6 ? 0.08 : 0.27, 0.183, -0.3 + index * 0.09],
          ]}
          color="#9aa28a"
          lineWidth={0.65}
        />
      ))}
      <mesh position={[0.03, 0.055, 0.59]} material={orange}>
        <boxGeometry args={[0.055, 0.012, 0.17]} />
      </mesh>
    </group>
  )
}

function Prototype(props: SelectionProps) {
  const gimbal = useRef<Group>(null!)
  const core = useRef<MeshStandardMaterial>(null!)
  useSelectionAnimation(props, (value) => {
    gimbal.current.rotation.set(0.1 + value * 0.2, value * 0.85, 0.15)
    core.current.emissiveIntensity = value * 0.8
  })
  return (
    <group rotation={[0, TARGETS.work.rotation, 0]}>
      <RoundedBox
        args={[0.85, 0.08, 0.83]}
        radius={0.035}
        smoothness={3}
        position={[0, 0.05, 0]}
        material={graphite}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.72, 0.065, 0.7]}
        radius={0.025}
        smoothness={3}
        position={[0, 0.12, 0]}
        material={paper}
        castShadow
      />
      <mesh position={[0, 0.28, 0]} material={graphite} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.3, 24]} />
      </mesh>
      <group ref={gimbal} position={[0, 0.47, 0]} rotation={[0.1, 0, 0.15]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={sage} castShadow>
          <torusGeometry args={[0.23, 0.055, 12, 32]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={orange} castShadow>
          <torusGeometry args={[0.23, 0.047, 12, 32]} />
        </mesh>
        <mesh castShadow>
          <sphereGeometry args={[0.095, 24, 24]} />
          <meshStandardMaterial
            ref={core}
            color="#f3eedb"
            emissive="#d9b969"
            emissiveIntensity={0}
          />
        </mesh>
        <mesh rotation={[0.35, 0, 0.3]} material={graphite}>
          <cylinderGeometry args={[0.018, 0.018, 0.56, 12]} />
        </mesh>
      </group>
      <mesh position={[0.25, 0.16, 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.015, 12]} />
        <meshStandardMaterial
          color={props.selected ? '#cce78c' : '#bc7854'}
          emissive="#cce78c"
          emissiveIntensity={props.selected ? 0.65 : 0}
        />
      </mesh>
    </group>
  )
}

function Papers(props: SelectionProps) {
  const top = useRef<Group>(null!)
  useSelectionAnimation(props, (value) => {
    top.current.rotation.x = value * 0.55
  })
  return (
    <group rotation={[0, TARGETS.publications.rotation, 0]}>
      {[0, 1].map((index) => (
        <RoundedBox
          key={index}
          args={[1.02, 0.024, 0.7]}
          radius={0.01}
          smoothness={3}
          position={[index * 0.012, 0.026 + index * 0.026, 0]}
          rotation={[0, (index - 1) * 0.045, 0]}
          material={paper}
          castShadow
          receiveShadow
        />
      ))}
      <group ref={top} position={[0.024, 0.078, 0.35]}>
        <RoundedBox
          args={[1.02, 0.024, 0.7]}
          radius={0.01}
          smoothness={3}
          position={[0, 0, -0.35]}
          material={paper}
          castShadow
          receiveShadow
        />
        <Line
          points={[
            [-0.34, 0.015, -0.57],
            [0.18, 0.015, -0.57],
          ]}
          color="#6e8160"
          lineWidth={2}
        />
        {[0, 1, 2, 3].map((index) => (
          <Line
            key={index}
            points={[
              [-0.34, 0.015, -0.44 + index * 0.075],
              [index === 3 ? 0.03 : 0.34, 0.015, -0.44 + index * 0.075],
            ]}
            color="#a8ad98"
            lineWidth={0.7}
          />
        ))}
        <Line
          points={[
            [-0.39, 0.019, -0.64],
            [-0.39, 0.019, -0.48],
            [-0.35, 0.019, -0.48],
            [-0.35, 0.019, -0.66],
          ]}
          color="#65745a"
          lineWidth={1.2}
        />
      </group>
    </group>
  )
}

function DeskObject({ id, props, children }: { id: Section; props: Props; children: ReactNode }) {
  const selected = props.selected === id
  const highlighted = props.hovered === id || selected
  const section = sections.find((entry) => entry.id === id)!
  const hover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    props.setHovered(id)
  }
  return (
    <>
      <group
        position={TARGETS[id].position}
        onClick={(event) => {
          event.stopPropagation()
          props.select(id)
        }}
        onPointerOver={hover}
        onPointerOut={() => props.setHovered(null)}
      >
        {children}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 0]}>
          <ringGeometry args={[0.67, 0.684, 64]} />
          <meshBasicMaterial
            color="#778c5d"
            transparent
            opacity={selected ? 0.9 : highlighted ? 0.45 : 0}
          />
        </mesh>
      </group>
      <Html position={TARGETS[id].label} center zIndexRange={[20, 0]}>
        <a
          href={`#${id}`}
          className={`scene-label ${highlighted ? 'highlighted' : ''}`}
          aria-current={selected ? 'page' : undefined}
          onClick={(event) => {
            event.stopPropagation()
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            props.select(id, event.currentTarget)
          }}
          onPointerEnter={() => props.setHovered(id)}
          onPointerLeave={() => props.setHovered(null)}
          onFocus={() => props.setHovered(id)}
          onBlur={() => props.setHovered(null)}
        >
          <span className="label-number">{section.number}</span>
          {section.label}
          {selected ? <CheckIcon /> : <ArrowIcon diagonal />}
        </a>
      </Html>
    </>
  )
}

function ContextMonitor({ onReady, onFailure }: Pick<Props, 'onReady' | 'onFailure'>) {
  const { gl } = useThree()
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault()
      onFailure()
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    onReady()
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onReady, onFailure])
  return null
}

export default function WorkbenchScene(props: Props) {
  const [contextLost, setContextLost] = useState(false)
  const mobile = useMemo(() => window.matchMedia('(max-width: 760px)').matches, [])
  const failure = useMemo(
    () => () => {
      setContextLost(true)
      props.onFailure()
    },
    [props.onFailure],
  )
  if (contextLost)
    return (
      <div className="scene-fallback" role="status">
        <p>The scene is unavailable. All sections are still accessible from the links.</p>
      </div>
    )
  return (
    <Canvas
      orthographic
      shadows
      // Keep the renderer in step with each frame of the drawer's width transition.
      // The default observer debounce otherwise waits until the layout stops moving.
      resize={{ debounce: 0 }}
      dpr={[1, mobile ? 1.25 : 1.5]}
      camera={{ position: [4.8, 6.4, 8.8], zoom: 80, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={!props.active ? 'never' : props.motionEnabled ? 'always' : 'demand'}
      style={{ cursor: props.hovered ? 'pointer' : 'default' }}
      fallback={
        <div className="scene-fallback">3D is unavailable. Please use the section links.</div>
      }
    >
      <CameraRig />
      <ContextMonitor onReady={props.onReady} onFailure={failure} />
      <ambientLight intensity={1.7} />
      <hemisphereLight args={['#fff6df', '#9b9f83', 1.5]} />
      <directionalLight
        position={[-3, 7, 4]}
        intensity={3.2}
        color="#fff4dc"
        castShadow
        shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-normalBias={0.03}
        shadow-bias={-0.0002}
        shadow-radius={3}
      />
      <directionalLight position={[4, 4, -5]} intensity={1.2} color="#f1f5e9" />
      <Desk />
      <RobotArm
        selected={props.selected}
        mode={props.mode}
        revision={props.revision}
        motionEnabled={props.motionEnabled}
        behaviorRequest={props.behaviorRequest}
        onPhaseChange={props.onPhaseChange}
        trackEnabled={props.trackEnabled}
        onTrackTimeChange={props.onTrackTimeChange}
      />
      <DeskObject id="education" props={props}>
        <Notebook
          selected={props.selected === 'education' && props.mode === 'reading'}
          motionEnabled={props.motionEnabled}
        />
      </DeskObject>
      <DeskObject id="work" props={props}>
        <Prototype
          selected={props.selected === 'work' && props.mode === 'reading'}
          motionEnabled={props.motionEnabled}
        />
      </DeskObject>
      <DeskObject id="publications" props={props}>
        <Papers
          selected={props.selected === 'publications' && props.mode === 'reading'}
          motionEnabled={props.motionEnabled}
        />
      </DeskObject>
    </Canvas>
  )
}
