import { ease } from '../engine/ease'
import type { EaseName } from '../engine/types'
import { roundTo } from './round'

/**
 * The shape of an easing as SVG polyline points in a box of the given size.
 * Time runs left to right and the eased value runs from the bottom (0) to the
 * top (1). `samples` is the number of segments, so it gives `samples + 1` points.
 */
export function easeCurvePoints(
  name: EaseName,
  width: number,
  height: number,
  samples: number,
): string {
  const points: string[] = []
  for (let index = 0; index <= samples; index++) {
    const t = index / samples
    const x = roundTo(t * width, 2)
    const y = roundTo(height - ease(name, t) * height, 2)
    points.push(`${String(x)},${String(y)}`)
  }
  return points.join(' ')
}
