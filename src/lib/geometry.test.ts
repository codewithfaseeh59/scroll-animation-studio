import type { LayerBase } from '../engine/types'
import { SNAP_THRESHOLD, normalizeDegrees, resizeBox, rotateByDrag, snapPosition } from './geometry'

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

describe('resizeBox', () => {
  // A 1000 x 500 px stage: x 10% = 100px, y 20% = 100px, 30% wide = 300px, 40% tall = 200px.
  const frame = { width: 1000, height: 500 }
  const start = box(10, 20, 30, 40)

  it('east handle: +100px widens to 40% and keeps the left edge', () => {
    expect(resizeBox(start, 'e', 100, 0, frame, 0, 1)).toEqual(box(10, 20, 40, 40))
  })

  it('west handle: -50px widens to 35% and keeps the right edge, so x becomes 5', () => {
    expect(resizeBox(start, 'w', -50, 0, frame, 0, 1)).toEqual(box(5, 20, 35, 40))
  })

  it('south handle: +50px makes it 50% tall and keeps the top edge', () => {
    expect(resizeBox(start, 's', 0, 50, frame, 0, 1)).toEqual(box(10, 20, 30, 50))
  })

  it('north-west corner: (-100, -50) keeps the bottom-right corner at 40% / 60%', () => {
    expect(resizeBox(start, 'nw', -100, -50, frame, 0, 1)).toEqual(box(0, 10, 40, 50))
  })

  it('an edge handle leaves the other dimension alone', () => {
    const result = resizeBox(start, 'e', 100, 999, frame, 0, 1)
    expect(result.y).toBe(20)
    expect(result.height).toBe(40)
  })

  it('stops at the minimum size of 1% and keeps the opposite edge: x stays 10', () => {
    expect(resizeBox(start, 'e', -1000, 0, frame, 0, 1)).toEqual(box(10, 20, 1, 40))
  })

  it('rotated 90 degrees, the east handle points down: +100px down widens to 40%', () => {
    const result = resizeBox(start, 'e', 0, 100, frame, 90, 1)
    expect(result.x).toBeCloseTo(5, 10)
    expect(result.y).toBeCloseTo(30, 10)
    expect(result.width).toBeCloseTo(40, 10)
    expect(result.height).toBeCloseTo(40, 10)
  })

  it('scaled 2x, 100px on screen is 50 box pixels: width 35%, x 12.5', () => {
    const result = resizeBox(start, 'e', 100, 0, frame, 0, 2)
    expect(result.x).toBeCloseTo(12.5, 10)
    expect(result.width).toBeCloseTo(35, 10)
  })

  it('does not change the start box', () => {
    resizeBox(start, 'e', 100, 0, frame, 0, 1)
    expect(start).toEqual(box(10, 20, 30, 40))
  })
})

describe('normalizeDegrees', () => {
  it.each([
    [90, 90],
    [190, -170],
    [-190, 170],
    [360, 0],
    [-180, -180],
    [180, -180],
  ])('%d becomes %d', (input, expected) => {
    expect(normalizeDegrees(input)).toBe(expected)
  })
})

describe('rotateByDrag', () => {
  const center = { x: 0, y: 0 }

  it('moving the pointer from the right of the centre to below it turns +90 (clockwise)', () => {
    expect(rotateByDrag(0, center, { x: 100, y: 0 }, { x: 0, y: 100 })).toBeCloseTo(90, 10)
  })

  it('adds to the starting rotation: 30 + 90 = 120', () => {
    expect(rotateByDrag(30, center, { x: 100, y: 0 }, { x: 0, y: 100 })).toBeCloseTo(120, 10)
  })

  it('moving above the centre turns -90', () => {
    expect(rotateByDrag(0, center, { x: 100, y: 0 }, { x: 0, y: -100 })).toBeCloseTo(-90, 10)
  })

  it('takes the short way across the half-turn: 174.29 to -174.29 is +11.42, not -348.58', () => {
    const result = rotateByDrag(0, center, { x: -100, y: 10 }, { x: -100, y: -10 })
    expect(result).toBeCloseTo(11.4212, 3)
  })

  it('does not turn when the pointer has not moved', () => {
    expect(rotateByDrag(45, center, { x: 10, y: 10 }, { x: 10, y: 10 })).toBe(45)
  })
})
