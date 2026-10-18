import { memo, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import {
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Float32BufferAttribute,
  Shape,
  Vector2,
  Vector3,
} from 'three'
import type { Hobby } from '../content'
import type { Point } from './config'

import { palette as colors } from './palette'

function Tube({
  points,
  radius = 0.018,
  color = colors.brass,
  closed = false,
}: {
  points: Point[]
  radius?: number
  color?: string
  closed?: boolean
}) {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        points.map((point) => new Vector3(...point)),
        closed,
      ),
    [points, closed],
  )
  return (
    <mesh>
      <tubeGeometry args={[curve, 48, radius, 8, closed]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.18} />
    </mesh>
  )
}

function Saxophone() {
  const bell = useMemo(
    () =>
      [
        [0.075, 0],
        [0.085, 0.08],
        [0.12, 0.2],
        [0.2, 0.31],
        [0.26, 0.35],
        [0.245, 0.35],
        [0.185, 0.31],
        [0.105, 0.2],
        [0.07, 0.08],
        [0.06, 0],
      ].map(([x, y]) => new Vector2(x, y)),
    [],
  )
  return (
    <group rotation={[0.05, -0.25, -0.12]} position={[-0.08, -0.1, 0]} scale={0.95}>
      <Tube
        radius={0.079}
        color={colors.paint}
        points={[
          [-0.31, 0.83, 0],
          [-0.13, 0.8, 0],
          [-0.08, 0.63, 0],
          [-0.12, 0.2, 0],
          [-0.13, -0.27, 0],
          [-0.03, -0.45, 0],
          [0.2, -0.43, 0],
          [0.32, -0.23, 0],
          [0.33, -0.05, 0],
        ]}
      />
      <group position={[0.33, -0.08, 0]} rotation={[0.18, 0, -0.24]}>
        <mesh>
          <latheGeometry args={[bell, 40]} />
          <meshStandardMaterial
            color={colors.paint}
            metalness={0.12}
            roughness={0.6}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.253, 0.012, 8, 40]} />
          <meshStandardMaterial color={colors.brass} metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.07, 24]} />
          <meshStandardMaterial color={colors.sage} />
        </mesh>
      </group>
      <RoundedBox
        args={[0.22, 0.075, 0.085]}
        radius={0.025}
        smoothness={3}
        position={[-0.38, 0.84, 0]}
        rotation={[0, 0, 0.18]}
      >
        <meshStandardMaterial color={colors.dark} roughness={0.6} />
      </RoundedBox>
      <Tube
        radius={0.014}
        color={colors.sage}
        points={[
          [0.015, -0.23, 0.075],
          [0.03, 0.16, 0.075],
          [0.055, 0.58, 0.075],
        ]}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <group
          key={i}
          position={[-0.1 + i * 0.008, -0.18 + i * 0.13, 0.09]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <mesh>
            <cylinderGeometry args={[0.041, 0.041, 0.025, 16]} />
            <meshStandardMaterial color={colors.brass} metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.018, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.012, 16]} />
            <meshStandardMaterial color={colors.cream} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <Tube
        radius={0.013}
        points={[
          [0, -0.3, 0.08],
          [0.13, -0.32, 0.09],
          [0.24, -0.18, 0.08],
        ]}
      />
    </group>
  )
}

function Basketball() {
  const seams = useMemo(
    () =>
      [-1, 1].map((side) =>
        Array.from({ length: 65 }, (_, i): Point => {
          const angle = (i / 64) * Math.PI * 2
          const x = side * 0.565 * (0.52 + 0.2 * Math.cos(angle * 2))
          const radius = Math.sqrt(0.565 ** 2 - x ** 2)
          return [x, radius * Math.sin(angle), radius * Math.cos(angle)]
        }),
      ),
    [],
  )
  return (
    <group rotation={[0.15, -0.25, -0.22]}>
      <mesh>
        <sphereGeometry args={[0.56, 48, 32]} />
        <meshStandardMaterial color={colors.paint} roughness={0.92} />
      </mesh>
      {[0, Math.PI / 2].map((angle) => (
        <mesh rotation={[0, angle, 0]} key={angle}>
          <torusGeometry args={[0.56, 0.009, 8, 64]} />
          <meshStandardMaterial color={colors.green} roughness={0.9} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.009, 8, 64]} />
        <meshStandardMaterial color={colors.green} roughness={0.9} />
      </mesh>
      {seams.map((points, i) => (
        <Tube key={i} points={points} radius={0.008} color={colors.green} closed />
      ))}
    </group>
  )
}

// Eighteen curved panels, with the strip direction alternating across faces.
function volleyballPanel(face: number, strip: number) {
  const vertices: number[] = []
  const indices: number[] = []
  const steps = 10
  for (let y = 0; y <= steps; y++) {
    for (let x = 0; x <= steps; x++) {
      let u = -1 + (strip * 2) / 3 + 0.012 + (x / steps) * (2 / 3 - 0.024)
      let v = -0.988 + (y / steps) * 1.976
      if (face % 2) [u, v] = [v, -u]
      const points: Point[] = [
        [u, v, 1],
        [-u, v, -1],
        [1, v, -u],
        [-1, v, u],
        [u, 1, -v],
        [u, -1, v],
      ]
      const point = new Vector3(...points[face]).normalize().multiplyScalar(0.563)
      vertices.push(...point.toArray())
      if (x < steps && y < steps) {
        const a = y * (steps + 1) + x
        indices.push(a, a + 1, a + steps + 1, a + 1, a + steps + 2, a + steps + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Volleyball() {
  const panels = useMemo(
    () => Array.from({ length: 18 }, (_, i) => volleyballPanel(Math.floor(i / 3), i % 3)),
    [],
  )
  return (
    <group rotation={[0.42, -0.45, -0.3]}>
      <mesh>
        <sphereGeometry args={[0.557, 40, 28]} />
        <meshStandardMaterial color={colors.sage} roughness={0.9} />
      </mesh>
      {panels.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={
              i % 3 === 1 ? (Math.floor(i / 3) % 2 ? colors.sage : colors.paint) : colors.cream
            }
            roughness={0.84}
          />
        </mesh>
      ))}
    </group>
  )
}

function ChessKnight() {
  const profile = useMemo(
    () =>
      [
        [0.35, -0.62],
        [0.38, -0.58],
        [0.37, -0.5],
        [0.3, -0.46],
        [0.27, -0.37],
        [0.2, -0.29],
        [0.2, -0.23],
        [0.28, -0.19],
        [0.28, -0.13],
        [0.18, -0.08],
      ].map(([x, y]) => new Vector2(x, y)),
    [],
  )
  const horse = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-0.2, -0.12)
    shape.quadraticCurveTo(-0.25, 0.05, -0.13, 0.21)
    shape.lineTo(-0.02, 0.34)
    shape.lineTo(-0.22, 0.32)
    shape.lineTo(-0.4, 0.39)
    shape.lineTo(-0.37, 0.54)
    shape.lineTo(-0.18, 0.63)
    shape.lineTo(-0.11, 0.8)
    shape.lineTo(-0.04, 0.71)
    shape.lineTo(0.06, 0.81)
    shape.lineTo(0.12, 0.61)
    shape.quadraticCurveTo(0.34, 0.35, 0.24, -0.12)
    shape.closePath()
    return shape
  }, [])
  return (
    <group rotation={[0.08, -0.48, 0]}>
      <mesh>
        <latheGeometry args={[profile, 40]} />
        <meshStandardMaterial color={colors.green} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, -0.12]}>
        <extrudeGeometry
          args={[
            horse,
            {
              depth: 0.24,
              bevelEnabled: true,
              bevelSize: 0.035,
              bevelThickness: 0.035,
              bevelSegments: 3,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color={colors.green} roughness={0.4} metalness={0.1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-0.15, 0.55, side * 0.153]}>
          <sphereGeometry args={[0.024, 12, 12]} />
          <meshStandardMaterial color={colors.cream} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -0.49, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.338, 0.012, 8, 40]} />
        <meshStandardMaterial color={colors.brass} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

function RunningShoe() {
  const upper = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-0.62, -0.17)
    shape.lineTo(-0.61, 0.16)
    shape.quadraticCurveTo(-0.48, 0.23, -0.29, 0.18)
    shape.lineTo(-0.08, 0.07)
    shape.quadraticCurveTo(0.22, 0.02, 0.46, -0.01)
    shape.quadraticCurveTo(0.63, -0.05, 0.63, -0.17)
    shape.closePath()
    return shape
  }, [])
  return (
    <group rotation={[0.3, -0.45, -0.08]} position={[0, -0.13, 0]}>
      <RoundedBox args={[1.44, 0.15, 0.62]} radius={0.07} smoothness={4} position={[0, -0.25, 0]}>
        <meshStandardMaterial color={colors.cream} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[1.35, 0.045, 0.56]} radius={0.02} smoothness={3} position={[0, -0.335, 0]}>
        <meshStandardMaterial color={colors.sage} roughness={1} />
      </RoundedBox>
      <mesh position={[0, 0, -0.22]}>
        <extrudeGeometry
          args={[
            upper,
            {
              depth: 0.44,
              bevelEnabled: true,
              bevelSize: 0.055,
              bevelThickness: 0.055,
              bevelSegments: 4,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color={colors.paint} roughness={0.9} />
      </mesh>
      <mesh position={[-0.45, 0.19, 0]} rotation={[-Math.PI / 2, 0.25, 0]} scale={[1, 1.6, 1]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial color={colors.dark} side={DoubleSide} roughness={1} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <Tube
          key={i}
          radius={0.016}
          color={colors.cream}
          points={[
            [-0.3 + i * 0.1, 0.2 - i * 0.033, -0.17],
            [-0.26 + i * 0.1, 0.23 - i * 0.033, 0],
            [-0.3 + i * 0.1, 0.2 - i * 0.033, 0.17],
          ]}
        />
      ))}
      <Tube
        radius={0.025}
        color={colors.cream}
        points={[
          [-0.36, 0.07, 0.28],
          [-0.15, -0.1, 0.28],
          [0.12, -0.07, 0.28],
          [0.32, -0.01, 0.27],
        ]}
      />
      <RoundedBox
        args={[0.07, 0.16, 0.12]}
        radius={0.025}
        smoothness={3}
        position={[-0.66, 0.1, 0]}
      >
        <meshStandardMaterial color={colors.clay} roughness={0.85} />
      </RoundedBox>
    </group>
  )
}

export default memo(function HobbyObject({ kind }: { kind: Hobby }) {
  if (kind === 'saxophone') return <Saxophone />
  if (kind === 'basketball') return <Basketball />
  if (kind === 'volleyball') return <Volleyball />
  if (kind === 'chess') return <ChessKnight />
  return <RunningShoe />
})
