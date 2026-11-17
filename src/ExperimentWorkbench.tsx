import { useId } from 'react'
import {
  experimentById,
  type ExperimentFrame,
  type ExperimentId,
  type ExperimentSettings,
  type Point2,
} from './experiments'
import './experiment-workbench.css'

type Props = {
  id: ExperimentId
  settings: ExperimentSettings
  progress: number
  frame: ExperimentFrame
}
const line = (points: Point2[]) => points.map((point) => point.join(',')).join(' ')

function Gripper({
  point,
  angle = 0,
  className = '',
}: {
  point: Point2
  angle?: number
  className?: string
}) {
  return (
    <g
      className={`experiment-gripper ${className}`}
      transform={`translate(${point[0]} ${point[1]}) rotate(${(angle * 180) / Math.PI})`}
    >
      <path d="M-3.3 -3.2V2.7H-1.7M3.3 -3.2V2.7H1.7M-3.3 -1.7H3.3" />
    </g>
  )
}

function Arm({ tip }: { tip: Point2 }) {
  const base: Point2 = [12, 58]
  const dx = tip[0] - base[0],
    dy = tip[1] - base[1]
  // A schematic task-space arm: keep its bend inside the tabletop even on
  // short reaches. Link lengths are illustrative rather than calibrated IK.
  const elbow: Point2 = [base[0] + dx * 0.5 + dy * 0.22, base[1] + dy * 0.5 - dx * 0.22]
  return (
    <g className="experiment-arm" aria-hidden="true">
      <circle cx={base[0]} cy={base[1]} r="5.3" className="experiment-arm-base" />
      <polyline points={line([base, elbow, tip])} className="experiment-arm-outline" />
      <path d={`M${base.join(' ')}L${elbow.join(' ')}`} className="experiment-arm-upper" />
      <path d={`M${elbow.join(' ')}L${tip.join(' ')}`} className="experiment-arm-lower" />
      {[base, elbow, tip].map((point, index) => (
        <g key={index}>
          <circle
            cx={point[0]}
            cy={point[1]}
            r={index === 2 ? 1.8 : 2.8}
            className="experiment-arm-joint"
          />
          <circle
            cx={point[0]}
            cy={point[1]}
            r={index === 2 ? 0.7 : 1.1}
            className="experiment-arm-pin"
          />
        </g>
      ))}
    </g>
  )
}

export default function ExperimentWorkbench({ id, settings, progress, frame }: Props) {
  const uid = useId().replace(/:/g, '')
  const titleId = `experiment-title-${uid}`,
    descriptionId = `experiment-description-${uid}`
  const experiment = experimentById(id)
  const hiddenCube = id === 'perception' && settings.intervention && (frame.uncertainty ?? 0) > 0
  const halfWidth =
    id === 'reward'
      ? settings.intervention
        ? 5
        : 2
      : id === 'grasps'
        ? 3 + settings.amount * 0.04
        : 2
  const halfHeight = id === 'grasps' ? 3 : halfWidth
  const estimateDiffers =
    frame.estimate &&
    Math.hypot(frame.estimate[0] - frame.object[0], frame.estimate[1] - frame.object[1]) > 1
  const springPoints: Point2[] =
    id === 'compliance'
      ? Array.from({ length: 17 }, (_, index) => {
          const x = frame.target[0] + ((frame.tip[0] - frame.target[0]) * index) / 16
          return [x, frame.target[1] + (index === 0 || index === 16 ? 0 : index % 2 ? -1.6 : 1.6)]
        })
      : []
  return (
    <div className={`experiment-workbench experiment-workbench-${id} outcome-${frame.outcome}`}>
      <div className="experiment-diagram-heading">
        <span>TABLETOP VIEW</span>
        <span>{experiment.modes[settings.mode === 'a' ? 0 : 1]}</span>
      </div>
      <svg
        className="experiment-diagram"
        viewBox="0 0 100 70"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{experiment.question}</title>
        <desc id={descriptionId}>
          {frame.status}{' '}
          {hiddenCube
            ? 'The outlined cube is its actual hidden position, shown to you but unavailable to the robot.'
            : ''}
        </desc>
        <defs>
          <pattern id={`grid-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0H0V5" fill="none" stroke="#d9dccc" strokeWidth=".12" />
          </pattern>
          <pattern
            id={`hatch-${uid}`}
            width="2"
            height="2"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <path d="M0 0V2" stroke="#a88065" strokeWidth=".5" />
          </pattern>
          <marker
            id={`arrow-${uid}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="#ad6749" />
          </marker>
        </defs>
        <rect x="2" y="4" width="96" height="63" rx="3" className="experiment-table-shadow" />
        <rect x="2" y="2.5" width="96" height="63" rx="3" className="experiment-table" />
        <rect x="5" y="5.5" width="90" height="57" rx="1" fill={`url(#grid-${uid})`} />
        <path d="M7 7.5h4M7 7.5v4M93 60.5h-4M93 60.5v-4" className="experiment-table-corners" />
        {frame.ghostPaths.map((path, index) => (
          <polyline
            key={index}
            points={line(path)}
            className={`experiment-ghost-path ghost-${index}`}
          />
        ))}
        <circle
          cx={frame.target[0]}
          cy={frame.target[1]}
          r={id === 'reward' ? 10 : 4.4}
          className={`experiment-target ${id === 'compliance' ? 'position-target' : ''}`}
        />
        {id !== 'grasps' && id !== 'compliance' && (
          <circle
            cx={frame.target[0]}
            cy={frame.target[1]}
            r=".65"
            className="experiment-target-center"
          />
        )}
        {frame.uncertainty !== undefined && frame.estimate && (
          <ellipse
            cx={frame.estimate[0]}
            cy={frame.estimate[1]}
            rx={frame.uncertainty}
            ry={frame.uncertainty * 0.72}
            className="experiment-uncertainty"
          />
        )}
        {frame.path.length > 1 && (
          <polyline points={line(frame.path)} className="experiment-planned-path" />
        )}
        {frame.obstacle && (
          <g>
            <rect
              x={frame.obstacle.x}
              y={frame.obstacle.y + 0.9}
              width={frame.obstacle.width}
              height={frame.obstacle.height}
              rx=".8"
              className="experiment-obstacle-shadow"
            />
            <rect
              x={frame.obstacle.x}
              y={frame.obstacle.y}
              width={frame.obstacle.width}
              height={frame.obstacle.height}
              rx=".8"
              className={id === 'perception' ? 'experiment-screen' : 'experiment-obstacle'}
            />
            <rect
              x={frame.obstacle.x}
              y={frame.obstacle.y}
              width={frame.obstacle.width}
              height={frame.obstacle.height}
              rx=".8"
              fill={`url(#hatch-${uid})`}
              opacity=".32"
            />
            <text
              x={frame.obstacle.x + frame.obstacle.width / 2}
              y={frame.obstacle.y + frame.obstacle.height / 2 + 0.8}
              className="experiment-svg-label obstacle-label"
            >
              {id === 'perception' ? 'SCREEN' : id === 'grasps' ? 'BLOCKED' : 'OBSTACLE'}
            </text>
          </g>
        )}
        {frame.grasps?.map((grasp, index) => (
          <g
            key={index}
            className={`experiment-grasp-candidate ${grasp.valid ? 'is-valid' : 'is-invalid'} ${grasp.selected ? 'is-selected' : ''}`}
          >
            <path
              d={`M${frame.object.join(' ')}L${grasp.point.join(' ')}`}
              className="experiment-grasp-approach"
            />
            <Gripper point={grasp.point} angle={grasp.angle + Math.PI / 2} />
            {!grasp.valid && (
              <path
                d={`M${grasp.point[0] - 1.4} ${grasp.point[1] - 1.4}l2.8 2.8m0 -2.8l-2.8 2.8`}
                className="experiment-invalid-mark"
              />
            )}
          </g>
        ))}
        <Arm tip={frame.tip} />
        {id === 'compliance' && (
          <>
            <circle
              cx={frame.target[0]}
              cy={frame.target[1]}
              r="1"
              className="experiment-rest-position"
            />
            <polyline points={line(springPoints)} className="experiment-spring" />
            {frame.force && Math.hypot(...frame.force) > 0.1 && (
              <g>
                <path
                  d={`M${frame.tip[0] - frame.force[0]} ${frame.tip[1] - frame.force[1]}L${frame.tip[0] - 2} ${frame.tip[1]}`}
                  className="experiment-force"
                  markerEnd={`url(#arrow-${uid})`}
                />
                <text
                  x={frame.tip[0] - frame.force[0] / 2}
                  y={frame.tip[1] - 4}
                  className="experiment-svg-label force-label"
                >
                  PUSH
                </text>
              </g>
            )}
          </>
        )}
        {estimateDiffers && frame.estimate && (
          <g className="experiment-estimated-object">
            <rect
              x={frame.estimate[0] - 2.4}
              y={frame.estimate[1] - 2.4}
              width="4.8"
              height="4.8"
              rx=".4"
            />
            <text x={frame.estimate[0]} y={frame.estimate[1] - 5} className="experiment-svg-label">
              LAST SEEN
            </text>
          </g>
        )}
        {id !== 'compliance' && (
          <g className={`experiment-cube ${hiddenCube ? 'is-hidden' : ''}`}>
            <rect
              x={frame.object[0] - halfWidth}
              y={frame.object[1] - halfHeight + 0.6}
              width={halfWidth * 2}
              height={halfHeight * 2}
              rx=".4"
              className="experiment-cube-shadow"
            />
            <rect
              x={frame.object[0] - halfWidth}
              y={frame.object[1] - halfHeight}
              width={halfWidth * 2}
              height={halfHeight * 2}
              rx=".4"
            />
            {!hiddenCube && (
              <path
                d={`M${frame.object[0] - halfWidth + 0.7} ${frame.object[1] - halfHeight + 0.7}h${Math.max(0, halfWidth * 2 - 1.4)}`}
                className="experiment-cube-highlight"
              />
            )}
            {id === 'perception' && settings.intervention && (
              <text
                x={frame.object[0]}
                y={frame.object[1] + halfHeight + 4}
                className="experiment-svg-label"
              >
                {hiddenCube ? 'ACTUAL · HIDDEN' : 'OBSERVED'}
              </text>
            )}
          </g>
        )}
        {id !== 'grasps' && (
          <Gripper point={frame.tip} angle={0} className="experiment-active-gripper" />
        )}
        {id === 'perception' && settings.mode === 'b' && settings.intervention && (
          <g
            className="experiment-camera"
            transform={`translate(${progress < 0.35 ? 47 + (progress / 0.35) * 42 : 89} 12)`}
          >
            <path d="M-3 -2h4v4h-4zM1 -1.4l2 -1v4.8l-2 -1z" />
            <text y="-4" className="experiment-svg-label">
              LOOK
            </text>
          </g>
        )}
        <text x="12" y="69" className="experiment-svg-label experiment-base-label">
          ARM BASE
        </text>
        <circle cx={frame.tip[0]} cy={frame.tip[1]} r=".6" className="experiment-tool-center" />
      </svg>
      <div className="experiment-diagram-legend" aria-hidden="true">
        <span>
          <i className="legend-actual" />
          {id === 'compliance'
            ? 'Spring response'
            : id === 'grasps'
              ? 'Chosen approach'
              : 'Chosen route'}
        </span>
        <span>
          <i className="legend-ghost" />
          {id === 'compliance'
            ? 'Rest position'
            : id === 'perception'
              ? 'Last observation'
              : id === 'grasps'
                ? 'Alternatives'
                : 'Comparison'}
        </span>
        <span>
          <i className="legend-target" />
          {id === 'compliance' ? 'Hold position' : id === 'grasps' ? 'Object' : 'Goal'}
        </span>
      </div>
    </div>
  )
}
