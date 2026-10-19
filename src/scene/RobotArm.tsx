import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Group, MeshStandardMaterial, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { ARM, type Pose } from './config'
import { ArmMotion, type ArmPhase, type BehaviorRequest } from './motion'
import { CUBE_SIZE } from './cubeRoutine'
import { TRACK_HEIGHT } from './trackRoutine'
import DanceConfetti from './DanceConfetti'
import BasketballHoop from './BasketballHoop'
import { palette } from './palette'
import type { Section } from '../content'
import type { Mode } from '../useNavigation'

const paint = new MeshStandardMaterial({ color: palette.paint, roughness: 0.6, metalness: 0.12 })
const cream = new MeshStandardMaterial({ color: palette.cream, roughness: 0.48, metalness: 0.08 })
const joint = new MeshStandardMaterial({ color: palette.joint, roughness: 0.5, metalness: 0.3 })
const brass = new MeshStandardMaterial({ color: palette.brass, roughness: 0.42, metalness: 0.55 })

function Joint({ radius = 0.21 }: { radius?: number }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={joint} castShadow>
        <cylinderGeometry args={[radius, radius, 0.36, 32]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 0.197]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={cream} castShadow>
            <cylinderGeometry args={[radius * 0.79, radius * 0.79, 0.045, 32]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * 0.027]} material={brass}>
            <cylinderGeometry args={[0.065, 0.065, 0.014, 20]} />
          </mesh>
          <mesh position={[0, 0, side * 0.037]} material={joint}>
            <boxGeometry args={[0.046, 0.009, 0.005]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Link({ length, upper = false }: { length: number; upper?: boolean }) {
  return (
    <group>
      <RoundedBox
        args={[upper ? 0.3 : 0.26, length - 0.1, 0.3]}
        radius={0.12}
        smoothness={4}
        position={[0, length / 2, 0]}
        material={upper ? paint : cream}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.13, length * 0.51, 0.016]}
        radius={0.007}
        smoothness={2}
        position={[0, length / 2, 0.157]}
        material={upper ? cream : paint}
      />
      {upper &&
        [0, 1, 2].map((i) => (
          <mesh position={[-0.151, length / 2 + i * 0.055, 0]} key={i} material={joint}>
            <boxGeometry args={[0.007, 0.018, 0.1]} />
          </mesh>
        ))}
    </group>
  )
}

type Props = {
  selected: Section | null
  mode: Mode
  revision: number
  motionEnabled: boolean
  behaviorRequest: BehaviorRequest | null
  onPhaseChange: (phase: ArmPhase) => void
  trackEnabled: boolean
  onTrackTimeChange: (seconds: number) => void
}

export default function RobotArm({
  selected,
  mode,
  revision,
  motionEnabled,
  behaviorRequest,
  onPhaseChange,
  trackEnabled,
  onTrackTimeChange,
}: Props) {
  const yaw = useRef<Group>(null!)
  const shoulder = useRef<Group>(null!)
  const elbow = useRef<Group>(null!)
  const wrist = useRef<Group>(null!)
  const roll = useRef<Group>(null!)
  const left = useRef<Group>(null!)
  const right = useRef<Group>(null!)
  const cube = useRef<Group>(null!)
  const trackTarget = useRef<Group>(null!)
  const lastTrackTime = useRef(0)
  const lastPhase = useRef<ArmPhase>('idle')
  const lastBehavior = useRef(behaviorRequest)
  const motion = useRef<ArmMotion | null>(null)
  if (!motion.current) motion.current = new ArmMotion()
  const invalidate = useThree((state) => state.invalidate)
  const { gl, camera } = useThree()

  const apply = (pose: Pose) => {
    yaw.current.rotation.y = pose[0]
    shoulder.current.rotation.z = pose[1]
    elbow.current.rotation.z = pose[2]
    wrist.current.rotation.z = pose[3]
    roll.current.rotation.y = pose[4]
    left.current.position.x = -pose[5]
    right.current.position.x = pose[5]
    const state = motion.current!.cube
    cube.current.visible = state !== null
    if (state) {
      cube.current.position.fromArray(state.position)
      cube.current.quaternion.fromArray(state.quaternion)
      cube.current.scale.setScalar(state.scale)
    }
    const phase = motion.current!.phase
    if (phase !== lastPhase.current) {
      lastPhase.current = phase
      onPhaseChange(phase)
    }
    const seconds = motion.current!.trackingSeconds
    if (seconds !== lastTrackTime.current) {
      lastTrackTime.current = seconds
      onTrackTimeChange(seconds)
    }
    const target = motion.current!.trackingTarget
    trackTarget.current.visible = target !== null
    if (target) trackTarget.current.position.fromArray(target)
  }

  useEffect(() => {
    motion.current!.sync({ selected, revision, mode, motionEnabled })
    apply(motion.current!.pose)
    invalidate()
  }, [selected, revision, mode, motionEnabled, invalidate, onPhaseChange])

  useEffect(() => {
    if (!behaviorRequest || lastBehavior.current === behaviorRequest) return
    lastBehavior.current = behaviorRequest
    if (behaviorRequest.kind !== 'track' || trackEnabled) {
      motion.current!.startBehavior(behaviorRequest.kind)
    }
    apply(motion.current!.pose)
    // A navigation or pause can supersede a click before this effect runs.
    onPhaseChange(motion.current!.phase)
    invalidate()
  }, [behaviorRequest, trackEnabled, invalidate, onPhaseChange])

  useEffect(() => {
    if (!trackEnabled) {
      motion.current!.stopTracking()
      apply(motion.current!.pose)
      invalidate()
      return
    }
    const surface = gl.domElement.closest('.scene-viewport') ?? gl.domElement
    const ray = new Raycaster()
    const plane = new Plane(new Vector3(0, 1, 0), -TRACK_HEIGHT)
    const pointer = new Vector2()
    const target = new Vector3()
    const follow = (event: Event) => {
      const { pointerType, clientX, clientY } = event as PointerEvent
      if (pointerType === 'touch' || motion.current!.phase !== 'tracking') return
      const bounds = gl.domElement.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      pointer.set(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((clientY - bounds.top) / bounds.height) * 2,
      )
      ray.setFromCamera(pointer, camera)
      if (ray.ray.intersectPlane(plane, target)) {
        motion.current!.setTrackTarget([target.x, target.y, target.z])
      }
    }
    surface.addEventListener('pointermove', follow, { passive: true })
    return () => surface.removeEventListener('pointermove', follow)
  }, [trackEnabled, camera, gl, invalidate])

  useEffect(
    () => () => {
      onPhaseChange('idle')
      onTrackTimeChange(0)
    },
    [onPhaseChange, onTrackTimeChange],
  )

  useFrame((_state, delta) => {
    if (motionEnabled) apply(motion.current!.tick(delta))
  })

  return (
    <>
      <DanceConfetti motion={motion} />
      <BasketballHoop motion={motion} />
      <group ref={trackTarget} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.07, 0.085, 32]} />
          <meshBasicMaterial color="#829673" transparent opacity={0.65} depthWrite={false} />
        </mesh>
      </group>
      <group ref={cube} visible={false}>
        <RoundedBox
          args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
          radius={0.018}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#be7046" roughness={0.65} />
        </RoundedBox>
        <mesh position={[0, 0, CUBE_SIZE / 2 + 0.001]}>
          <circleGeometry args={[0.028, 20]} />
          <meshStandardMaterial color="#f3e9cf" roughness={0.9} />
        </mesh>
        <mesh position={[0, CUBE_SIZE / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.028, 20]} />
          <meshStandardMaterial color="#f3e9cf" roughness={0.9} />
        </mesh>
      </group>
      <group position={ARM.base} dispose={null}>
        <mesh position={[0, 0.075, 0]} material={joint} castShadow receiveShadow>
          <cylinderGeometry args={[0.37, 0.41, 0.15, 48]} />
        </mesh>
        <mesh position={[0, 0.16, 0]} material={paint} castShadow>
          <cylinderGeometry args={[0.32, 0.37, 0.06, 48]} />
        </mesh>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}-${z}`} position={[x * 0.23, 0.153, z * 0.23]} material={brass}>
              <cylinderGeometry args={[0.023, 0.023, 0.012, 12]} />
            </mesh>
          )),
        )}
        <group ref={yaw}>
          <mesh position={[0, 0.29, 0]} material={cream} castShadow>
            <cylinderGeometry args={[0.19, 0.26, 0.25, 32]} />
          </mesh>
          <mesh position={[0, 0.38, 0.196]}>
            <sphereGeometry args={[0.027, 12, 12]} />
            <meshStandardMaterial color="#d7e6a1" emissive="#bfdc75" emissiveIntensity={0.35} />
          </mesh>
          <group ref={shoulder} position={[0, ARM.shoulderHeight, 0]}>
            <Joint />
            <Link length={ARM.upper} upper />
            <group ref={elbow} position={[0, ARM.upper, 0]}>
              <Joint radius={0.19} />
              <Link length={ARM.forearm} />
              <group ref={wrist} position={[0, ARM.forearm, 0]}>
                <Joint radius={0.14} />
                <group ref={roll}>
                  <mesh position={[0, 0.13, 0]} material={joint} castShadow>
                    <cylinderGeometry args={[0.11, 0.13, 0.18, 24]} />
                  </mesh>
                  <mesh position={[0, 0.15, 0]} material={brass}>
                    <cylinderGeometry args={[0.114, 0.114, 0.035, 24]} />
                  </mesh>
                  <RoundedBox
                    args={[0.3, 0.1, 0.18]}
                    position={[0, 0.24, 0]}
                    radius={0.035}
                    smoothness={3}
                    material={paint}
                    castShadow
                  />
                  {[-1, 1].map((side) => (
                    <group key={side} ref={side < 0 ? left : right}>
                      <RoundedBox
                        args={[0.055, 0.17, 0.08]}
                        position={[0, 0.32, 0]}
                        radius={0.02}
                        smoothness={3}
                        material={joint}
                        castShadow
                      />
                      <RoundedBox
                        args={[0.08, 0.04, 0.085]}
                        position={[-side * 0.019, 0.395, 0]}
                        radius={0.012}
                        smoothness={3}
                        material={cream}
                        castShadow
                      />
                    </group>
                  ))}
                  <group name="tool-center" position={[0, ARM.tool, 0]} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  )
}
