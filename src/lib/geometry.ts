import type { LayerBase } from '../engine/types'

/** How close (in percent of the stage) an edge or centre must be to snap. */
export const SNAP_THRESHOLD = 1

const GUIDE_EPSILON = 1e-9

export interface SnapGuides {
  /** Positions (percent of stage width) of vertical alignment lines. */
  x: number[]
  /** Positions (percent of stage height) of horizontal alignment lines. */
  y: number[]
}

export interface SnapResult {
  x: number
  y: number
  guides: SnapGuides
}

interface AxisSnap {
  position: number
  guides: number[]
}

function snapAxis(
  start: number,
  size: number,
  targets: readonly number[],
  threshold: number,
): AxisSnap {
  const candidates = [start, start + size / 2, start + size]
  let bestOffset = 0
  let bestDistance = Infinity
  for (const candidate of candidates) {
    for (const target of targets) {
      const offset = target - candidate
      const distance = Math.abs(offset)
      if (distance <= threshold && distance < bestDistance) {
        bestDistance = distance
        bestOffset = offset
      }
    }
  }
  const position = start + bestOffset
  if (bestDistance === Infinity) return { position, guides: [] }

  const snapped = candidates.map((candidate) => candidate + bestOffset)
  const guides = targets
    .filter((target) => snapped.some((value) => Math.abs(value - target) < GUIDE_EPSILON))
    .sort((a, b) => a - b)
  return { position, guides: [...new Set(guides)] }
}

/**
 * Snaps a box being moved to the stage edges, the stage centre, and the edges
 * and centres of other layers. Each axis snaps on its own, to the closest
 * alignment within the threshold. All values are percent of the stage.
 */
export function snapPosition(
  moving: LayerBase,
  others: readonly LayerBase[],
  threshold: number = SNAP_THRESHOLD,
): SnapResult {
  const xTargets = [0, 50, 100]
  const yTargets = [0, 50, 100]
  for (const other of others) {
    xTargets.push(other.x, other.x + other.width / 2, other.x + other.width)
    yTargets.push(other.y, other.y + other.height / 2, other.y + other.height)
  }
  const x = snapAxis(moving.x, moving.width, xTargets, threshold)
  const y = snapAxis(moving.y, moving.height, yTargets, threshold)
  return { x: x.position, y: y.position, guides: { x: x.guides, y: y.guides } }
}

/** Smallest width or height a layer can be resized to, in percent of the stage. */
export const MIN_SIZE = 1

export const RESIZE_HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const

export type ResizeHandle = (typeof RESIZE_HANDLES)[number]

export interface FrameSize {
  width: number
  height: number
}

/** Which edges a handle moves: -1 is the left or top edge, 1 the right or bottom edge. */
const HANDLE_DIRECTIONS: Record<ResizeHandle, { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }> = {
  n: { sx: 0, sy: -1 },
  ne: { sx: 1, sy: -1 },
  e: { sx: 1, sy: 0 },
  se: { sx: 1, sy: 1 },
  s: { sx: 0, sy: 1 },
  sw: { sx: -1, sy: 1 },
  w: { sx: -1, sy: 0 },
  nw: { sx: -1, sy: -1 },
}

/**
 * Resizes a box by dragging one of its handles.
 *
 * The pointer moved by (deltaX, deltaY) pixels. The box may be rotated about
 * its centre and scaled, so the movement is first turned into the box's own
 * axes. The edge opposite the handle stays where it is on screen, which means
 * the centre moves by half of the size change. The maths is done in pixels
 * because a percent of the stage width is not the same length as a percent of
 * its height. Returns the new base in percent of the stage.
 */
export function resizeBox(
  start: LayerBase,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  frame: FrameSize,
  rotation: number,
  scale: number,
): LayerBase {
  const angle = (rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const { sx, sy } = HANDLE_DIRECTIONS[handle]

  const startWidth = (start.width * frame.width) / 100
  const startHeight = (start.height * frame.height) / 100
  const centerX = ((start.x + start.width / 2) * frame.width) / 100
  const centerY = ((start.y + start.height / 2) * frame.height) / 100

  // Pointer movement along the box's own axes, in the box's own (unscaled) units.
  const localX = (deltaX * cos + deltaY * sin) / scale
  const localY = (-deltaX * sin + deltaY * cos) / scale

  const width =
    sx === 0 ? startWidth : Math.max((MIN_SIZE * frame.width) / 100, startWidth + sx * localX)
  const height =
    sy === 0 ? startHeight : Math.max((MIN_SIZE * frame.height) / 100, startHeight + sy * localY)

  // Centre shift along the box's own axes, in screen pixels, then rotated onto the screen.
  const shiftX = (sx * (width - startWidth) * scale) / 2
  const shiftY = (sy * (height - startHeight) * scale) / 2
  const newCenterX = centerX + shiftX * cos - shiftY * sin
  const newCenterY = centerY + shiftX * sin + shiftY * cos

  return {
    x: ((newCenterX - width / 2) / frame.width) * 100,
    y: ((newCenterY - height / 2) / frame.height) * 100,
    width: (width / frame.width) * 100,
    height: (height / frame.height) * 100,
  }
}

export interface Point {
  x: number
  y: number
}

/** Brings an angle in degrees into the range -180 (included) to 180 (excluded). */
export function normalizeDegrees(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180
}

function angleOf(center: Point, point: Point): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
}

/**
 * New rotation in degrees while dragging the rotate handle around a centre.
 * Screen y points down, so a positive turn is clockwise, like CSS rotate().
 * The turn is measured from where the drag started.
 */
export function rotateByDrag(
  startRotation: number,
  center: Point,
  startPointer: Point,
  pointer: Point,
): number {
  const turned = angleOf(center, pointer) - angleOf(center, startPointer)
  return startRotation + normalizeDegrees(turned)
}
