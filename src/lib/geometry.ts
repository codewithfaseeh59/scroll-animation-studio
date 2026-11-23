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
