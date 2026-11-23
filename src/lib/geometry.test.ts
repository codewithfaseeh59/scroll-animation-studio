import type { LayerBase } from '../engine/types'
import { SNAP_THRESHOLD, snapPosition } from './geometry'

function box(x: number, y: number, width: number, height: number): LayerBase {
  return { x, y, width, height }
}

describe('snapPosition', () => {
  it('uses a threshold of 1 percent by default', () => {
    expect(SNAP_THRESHOLD).toBe(1)
  })

  it('snaps the left edge to the stage edge: x 0.5 becomes 0', () => {
    const result = snapPosition(box(0.5, 30, 20, 10), [], 1)
    expect(result.x).toBe(0)
    expect(result.guides.x).toEqual([0])
  })

  it('leaves an axis alone when nothing is close: y 30 with height 10 stays 30', () => {
    const result = snapPosition(box(0.5, 30, 20, 10), [], 1)
    expect(result.y).toBe(30)
    expect(result.guides.y).toEqual([])
  })

  it('snaps the centre to the stage centre: x 39.4, width 20 (centre 49.4) becomes 40', () => {
    const result = snapPosition(box(39.4, 30, 20, 10), [], 1)
    expect(result.x).toBeCloseTo(40, 10)
    expect(result.guides.x).toEqual([50])
  })

  it('snaps the right edge to the stage edge: x 79.5, width 20 (right 99.5) becomes 80', () => {
    const result = snapPosition(box(79.5, 30, 20, 10), [], 1)
    expect(result.x).toBeCloseTo(80, 10)
    expect(result.guides.x).toEqual([100])
  })

  it('snaps vertically too: y 49.6, height 10 (top 49.6) becomes 50', () => {
    const result = snapPosition(box(20, 49.6, 20, 10), [], 1)
    expect(result.y).toBeCloseTo(50, 10)
    expect(result.guides.y).toEqual([50])
  })

  it('snaps when the distance equals the threshold but not beyond it', () => {
    expect(snapPosition(box(1, 30, 20, 10), [], 1).x).toBe(0)
    expect(snapPosition(box(1.5, 30, 20, 10), [], 1).x).toBe(1.5)
  })

  it('snaps to another layer: centre 59.6 goes to the other left edge 60, so x 54.6 becomes 55', () => {
    const others = [box(60, 10, 20, 20)]
    const result = snapPosition(box(54.6, 70, 10, 10), others, 1)
    expect(result.x).toBeCloseTo(55, 10)
    expect(result.guides.x).toEqual([60])
  })

  it('snaps to the centre line of another layer: centre 20.4 goes to 20, so y 15.6 becomes 15.2', () => {
    const others = [box(60, 10, 20, 20)]
    const result = snapPosition(box(5, 15.6, 10, 9.6), others, 1)
    expect(result.y).toBeCloseTo(15.2, 10)
    expect(result.guides.y).toEqual([20])
  })

  it('picks the closest alignment: left is 0.4 from 0, right 20.4 is 0.6 from 21, so x 0.4 becomes 0', () => {
    const others = [box(21, 70, 10, 10)]
    const result = snapPosition(box(0.4, 30, 20, 10), others, 1)
    expect(result.x).toBe(0)
    expect(result.guides.x).toEqual([0])
  })

  it('reports every line that lines up: a full-width box shows 0, 50 and 100', () => {
    const result = snapPosition(box(0.3, 30, 100, 10), [], 1)
    expect(result.x).toBeCloseTo(0, 10)
    expect(result.guides.x).toEqual([0, 50, 100])
  })

  it('does not change the moving box size', () => {
    const moving = box(0.5, 30, 20, 10)
    snapPosition(moving, [], 1)
    expect(moving).toEqual(box(0.5, 30, 20, 10))
  })
})
