import { clamp } from '../lib/clamp'
import type { EaseName } from './types'

type EaseFunction = (t: number) => number

const NEWTON_ITERATIONS = 8
const BISECTION_ITERATIONS = 40
const PRECISION = 1e-7

/**
 * Builds the easing function of a CSS cubic-bezier(x1, y1, x2, y2) curve.
 * The curve is parametric (x(s), y(s)), so for a given time t we first find s
 * where x(s) = t, then return y(s).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFunction {
  const coordinate = (s: number, p1: number, p2: number): number =>
    3 * (1 - s) * (1 - s) * s * p1 + 3 * (1 - s) * s * s * p2 + s * s * s
  const slope = (s: number, p1: number, p2: number): number =>
    3 * (1 - s) * (1 - s) * p1 + 6 * (1 - s) * s * (p2 - p1) + 3 * s * s * (1 - p2)

  const solveS = (t: number): number => {
    let s = t
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const error = coordinate(s, x1, x2) - t
      if (Math.abs(error) < PRECISION) return s
      const derivative = slope(s, x1, x2)
      if (Math.abs(derivative) < PRECISION) break
      s -= error / derivative
    }
    let low = 0
    let high = 1
    s = t
    for (let i = 0; i < BISECTION_ITERATIONS; i++) {
      if (coordinate(s, x1, x2) < t) low = s
      else high = s
      s = (low + high) / 2
    }
    return s
  }

  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return coordinate(solveS(t), y1, y2)
  }
}

interface Easing {
  apply: EaseFunction
  /** Value for the CSS animation-timing-function property. */
  css: string
}

const EASINGS: Record<EaseName, Easing> = {
  linear: { apply: (t) => t, css: 'linear' },
  // The three CSS keywords below are defined by the CSS spec as these exact curves.
  easeIn: { apply: cubicBezier(0.42, 0, 1, 1), css: 'ease-in' },
  easeOut: { apply: cubicBezier(0, 0, 0.58, 1), css: 'ease-out' },
  easeInOut: { apply: cubicBezier(0.42, 0, 0.58, 1), css: 'ease-in-out' },
  power2In: { apply: (t) => t * t, css: 'cubic-bezier(0.11, 0, 0.5, 0)' },
  power2Out: { apply: (t) => 1 - (1 - t) * (1 - t), css: 'cubic-bezier(0.5, 1, 0.89, 1)' },
  power2InOut: {
    apply: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
    css: 'cubic-bezier(0.45, 0, 0.55, 1)',
  },
  sineInOut: {
    apply: (t) => (1 - Math.cos(Math.PI * t)) / 2,
    css: 'cubic-bezier(0.37, 0, 0.63, 1)',
  },
}

/** Maps linear progress t (clamped to 0..1) to eased progress. */
export function ease(name: EaseName, t: number): number {
  return EASINGS[name].apply(clamp(t, 0, 1))
}

/** The CSS timing function that matches an easing in exported code. */
export function easeToCss(name: EaseName): string {
  return EASINGS[name].css
}
