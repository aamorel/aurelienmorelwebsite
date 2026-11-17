import { Box3, Matrix4, OrthographicCamera, Vector3 } from 'three'
import {
  HOOP_CENTER,
  HOOP_FACING,
  SHOT_FLIGHT_TIME,
  SHOT_GRAVITY,
  SHOT_RELEASE,
  SHOT_VELOCITY,
} from './basketball'

export type ActionFraming = 'playing' | 'dancing' | null

function corners(min: number[], max: number[]) {
  return Array.from(
    { length: 8 },
    (_, index) =>
      new Vector3(
        index & 1 ? max[0] : min[0],
        index & 2 ? max[1] : min[1],
        index & 4 ? max[2] : min[2],
      ),
  )
}

export function actionFramePoints(action: Exclude<ActionFraming, null>) {
  if (action === 'dancing') {
    // Include the globe's reveal motion and the entire suspension cord.
    return corners([-0.34, 2.38, -0.94], [0.34, 3.4, -0.26])
  }
  const hoopTransform = new Matrix4().makeRotationY(HOOP_FACING)
  hoopTransform.setPosition(...HOOP_CENTER)
  const points = corners([-0.6, -1.68, -1.12], [0.6, 0.9, 0.43]).map((point) =>
    point.applyMatrix4(hoopTransform),
  )
  // Also fit the airborne cube along the complete basketball shot.
  for (let step = 0; step <= 40; step++) {
    const time = (SHOT_FLIGHT_TIME * step) / 40
    const center = SHOT_RELEASE.map(
      (value, axis) =>
        value + SHOT_VELOCITY[axis] * time - (axis === 1 ? (SHOT_GRAVITY * time ** 2) / 2 : 0),
    )
    points.push(
      ...corners(
        center.map((value) => value - 0.2),
        center.map((value) => value + 0.2),
      ),
    )
  }
  return points
}

export function frameWorkbench(
  camera: OrthographicCamera,
  width: number,
  height: number,
  labMode: boolean,
  action: ActionFraming,
) {
  camera.position.set(4.8, 6.4, 8.8)
  camera.lookAt(-0.25, labMode ? 0.75 : 0.05, 0)
  camera.zoom = Math.min(width / 7.4, height / (labMode ? 5.2 : 4.4))
  camera.updateMatrixWorld()
  if (!labMode && action) {
    // Preserve everything in the resting view, including the HTML labels.
    const halfWidth = width / (2 * camera.zoom)
    const halfHeight = height / (2 * camera.zoom)
    const bounds = new Box3(
      new Vector3(-halfWidth, -halfHeight, 0),
      new Vector3(halfWidth, halfHeight, 0),
    )
    for (const point of actionFramePoints(action)) {
      bounds.expandByPoint(point.applyMatrix4(camera.matrixWorldInverse))
    }
    const center = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    const padding = Math.min(20, width * 0.04, height * 0.06)
    camera.zoom = Math.min(
      camera.zoom,
      (width - padding * 2) / size.x,
      (height - padding * 2) / size.y,
    )
    camera.translateX(center.x)
    camera.translateY(center.y)
  }
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}
