import { expect, it } from 'vitest'
import { OrthographicCamera, Vector3 } from 'three'
import { actionFramePoints, frameWorkbench } from './cameraFraming'

for (const [width, height] of [
  [1040, 310],
  [1200, 230],
  [680, 360],
  [340, 500],
  [375, 280],
]) {
  for (const action of ['playing', 'dancing'] as const) {
    it(`fits the entire ${action} animation and resting view at ${width}×${height}`, () => {
      const camera = new OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        100,
      )
      frameWorkbench(camera, width, height, false, null)
      const restingCorners = [-1, 1].flatMap((x) =>
        [-1, 1].map((y) => new Vector3(x, y, 0).unproject(camera)),
      )
      frameWorkbench(camera, width, height, false, action)
      for (const point of [...actionFramePoints(action), ...restingCorners]) {
        const screen = point.clone().project(camera)
        expect(Math.abs(screen.x)).toBeLessThan(1)
        expect(Math.abs(screen.y)).toBeLessThan(1)
        expect(Math.abs(screen.z)).toBeLessThan(1)
      }
      frameWorkbench(camera, width, height, false, null)
      expect(camera.zoom).toBe(Math.min(width / 7.4, height / 4.4))
    })
  }
}

it('preserves the lab camera regardless of the home animation state', () => {
  const camera = new OrthographicCamera(-450, 450, 250, -250, 0.1, 100)
  frameWorkbench(camera, 900, 500, true, null)
  const position = camera.position.clone()
  const projection = camera.projectionMatrix.clone()
  frameWorkbench(camera, 900, 500, true, 'playing')
  expect(camera.position).toEqual(position)
  expect(camera.projectionMatrix).toEqual(projection)
})
