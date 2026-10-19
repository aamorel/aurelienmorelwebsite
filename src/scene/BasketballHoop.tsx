import { useLayoutEffect, useRef, type ComponentRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, RoundedBox } from '@react-three/drei'
import {
  Group,
  Material,
  Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  RGBADepthPacking,
} from 'three'
import { HOOP_CENTER, HOOP_FACING, HOOP_RADIUS, RIM_THICKNESS } from './basketball'
import { palette } from './palette'
import type { ArmMotion } from './motion'
import { smooth, type Point } from './config'

const net: Point[] = []
const radii = [HOOP_RADIUS, 0.35, 0.3, 0.27]
const heights = [0, -0.14, -0.3, -0.48]
for (let strand = 0; strand < 12; strand++) {
  for (const direction of [-1, 1]) {
    for (let level = 0; level < heights.length - 1; level++) {
      for (const row of [level, level + 1]) {
        const angle = (strand * Math.PI) / 6 + (direction * row * Math.PI) / 12
        net.push([radii[row] * Math.cos(angle), heights[row], radii[row] * Math.sin(angle)])
      }
    }
  }
}

export default function BasketballHoop({
  motion,
  motionEnabled,
}: {
  motion: RefObject<ArmMotion | null>
  motionEnabled: boolean
}) {
  const hoop = useRef<Group>(null!)
  const reveal = useRef(0)
  const materials = useRef<Material[]>([])
  const shadowOpacity = useRef({ value: 0 })
  const netLines = useRef<ComponentRef<typeof Line>>(null!)
  const lastReaction = useRef(0)
  const rim = useRef<MeshStandardMaterial>(null!)
  useLayoutEffect(() => {
    // Fade the shadow too, so it never appears before the hoop itself.
    const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, alphaHash: true })
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.hoopOpacity = shadowOpacity.current
      shader.fragmentShader = `uniform float hoopOpacity;\n${shader.fragmentShader}`.replace(
        '#include <alphahash_fragment>',
        'diffuseColor.a *= hoopOpacity;\n#include <alphahash_fragment>',
      )
    }
    depth.customProgramCacheKey = () => 'hoop-shadow-fade'
    const unique = new Set<Material>()
    const meshes: Mesh[] = []
    hoop.current.traverse((object) => {
      if (!(object instanceof Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        material.transparent = true
        material.opacity = 0
        material.depthWrite = false
        material.needsUpdate = true
        unique.add(material)
      }
      if (object.castShadow) {
        object.customDepthMaterial = depth
        meshes.push(object)
      }
    })
    materials.current = [...unique]
    return () => {
      meshes.forEach((mesh) => {
        mesh.customDepthMaterial = undefined
      })
      depth.dispose()
    }
  }, [])

  useFrame((_state, delta) => {
    const target = motionEnabled && motion.current?.phase === 'playing' ? 1 : 0
    // A short rise and an eased fade; keep the exact shot target once revealed.
    // Pausing or enabling reduced motion hides it immediately in demand mode.
    reveal.current = motionEnabled
      ? Math.max(
          0,
          Math.min(
            1,
            reveal.current + (Math.sign(target - reveal.current) * Math.min(delta, 0.06)) / 0.65,
          ),
        )
      : 0
    const opacity = smooth(reveal.current)
    hoop.current.visible = opacity > 0
    hoop.current.position.y = HOOP_CENTER[1] - 0.12 * (1 - opacity)
    shadowOpacity.current.value = opacity
    for (const material of materials.current) {
      material.opacity = opacity
      material.depthWrite = opacity === 1
    }
    const time = motion.current?.basketTime ?? null
    const reaction = time === null || time >= 0.4 ? 0 : Math.sin((time / 0.4) * Math.PI)
    if (reaction === lastReaction.current) return
    lastReaction.current = reaction
    const start = netLines.current.geometry.getAttribute('instanceStart')
    const end = netLines.current.geometry.getAttribute('instanceEnd')
    // Keep every attachment at the rim fixed; the lower net stretches and
    // follows the cube, then settles. Reuse the existing GPU buffers.
    net.forEach(([x, y, z], index) => {
      const depth = y / heights[heights.length - 1]
      const attribute = index % 2 === 0 ? start : end
      attribute.setXYZ(
        Math.floor(index / 2),
        x,
        y * (1 + reaction * 0.12 * depth),
        z - reaction * 0.2 * depth ** 2,
      )
    })
    start.needsUpdate = true
    end.needsUpdate = true
    rim.current.emissiveIntensity = reaction * 0.35
  })

  return (
    <group ref={hoop} visible={false} position={HOOP_CENTER} rotation={[0, HOOP_FACING, 0]}>
      <RoundedBox
        args={[0.75, 0.1, 0.8]}
        radius={0.045}
        smoothness={3}
        position={[0, -1.5, -0.7]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={palette.green} roughness={0.8} />
      </RoundedBox>
      <mesh position={[0, -0.53, -0.7]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.94, 16]} />
        <meshStandardMaterial color={palette.sage} metalness={0.35} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.37, -0.6]} castShadow>
        <boxGeometry args={[0.09, 0.09, 0.2]} />
        <meshStandardMaterial color={palette.sage} metalness={0.35} roughness={0.55} />
      </mesh>
      <RoundedBox
        args={[1.12, 0.87, 0.045]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.42, -0.525]}
        castShadow
      >
        <meshStandardMaterial color={palette.green} roughness={0.65} />
      </RoundedBox>
      <RoundedBox
        args={[1.05, 0.8, 0.07]}
        radius={0.03}
        smoothness={3}
        position={[0, 0.42, -0.48]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={palette.cream} roughness={0.7} />
      </RoundedBox>
      <Line
        points={[
          [-0.17, 0.13, -0.441],
          [-0.17, 0.44, -0.441],
          [0.17, 0.44, -0.441],
          [0.17, 0.13, -0.441],
          [-0.17, 0.13, -0.441],
        ]}
        color={palette.sage}
        lineWidth={2}
        transparent
      />
      <mesh position={[0, 0, -0.415]} castShadow>
        <boxGeometry args={[0.12, 0.07, 0.12]} />
        <meshStandardMaterial color={palette.brass} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[HOOP_RADIUS, RIM_THICKNESS, 10, 64]} />
        <meshStandardMaterial
          ref={rim}
          color={palette.clay}
          emissive={palette.brass}
          emissiveIntensity={0}
          metalness={0.25}
          roughness={0.5}
        />
      </mesh>
      <Line
        ref={netLines}
        points={net}
        segments
        color={palette.paper}
        lineWidth={1.3}
        transparent
        frustumCulled={false}
      />
    </group>
  )
}
