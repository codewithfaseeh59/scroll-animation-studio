import { clamp } from './clamp'

/**
 * Scroll progress (0..1) under a pointer on the timeline track, which starts
 * at `trackLeft` and is `trackWidth` pixels wide. Outside the track the value
 * stops at 0 or 1.
 */
export function progressFromPointer(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
): number {
  if (trackWidth <= 0) return 0
  return clamp((clientX - trackLeft) / trackWidth, 0, 1)
}

/** Progress as a percentage label with at most one decimal: 0.125 gives "12.5%". */
export function formatPercent(progress: number): string {
  return `${String(Math.round(progress * 1000) / 10)}%`
}
