import { ease } from './ease'
import {
  ANIMATABLE_PROPERTIES,
  type AnimatableProperty,
  type EaseName,
  type Keyframe,
  type Layer,
} from './types'

export type ResolvedValues = Record<AnimatableProperty, number>

/** What a property is worth when no keyframe of the layer defines it. */
export const DEFAULT_VALUES: ResolvedValues = {
  translateX: 0,
  translateY: 0,
  scale: 1,
  rotate: 0,
  opacity: 1,
  blur: 0,
}

interface Stop {
  progress: number
  value: number
  ease: EaseName
}

function stopsFor(keyframes: readonly Keyframe[], property: AnimatableProperty): Stop[] {
  const stops: Stop[] = []
  for (const keyframe of keyframes) {
    const value = keyframe.values[property]
    if (value !== undefined) stops.push({ progress: keyframe.progress, value, ease: keyframe.ease })
  }
  return stops
}

/**
 * Value of one property at a scroll progress, or undefined when no keyframe
 * defines it. Keyframes must be sorted by progress (the document guarantees it).
 * Keyframes that do not define the property are skipped, so the nearest ones
 * that do are used. Before the first stop and after the last the value is held.
 * Between two stops the SECOND stop's ease shapes the local progress.
 */
export function interpolateProperty(
  keyframes: readonly Keyframe[],
  property: AnimatableProperty,
  progress: number,
): number | undefined {
  const stops = stopsFor(keyframes, property)
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) return undefined
  if (progress <= first.progress) return first.value
  if (progress >= last.progress) return last.value

  const nextIndex = stops.findIndex((stop) => stop.progress > progress)
  const from = stops[nextIndex - 1]
  const to = stops[nextIndex]
  if (!from || !to) return last.value

  const local = (progress - from.progress) / (to.progress - from.progress)
  return from.value + (to.value - from.value) * ease(to.ease, local)
}

/** Every animatable value of a layer at a scroll progress, with defaults filled in. */
export function interpolateLayer(layer: Layer, progress: number): ResolvedValues {
  const resolved = { ...DEFAULT_VALUES }
  for (const property of ANIMATABLE_PROPERTIES) {
    resolved[property] =
      interpolateProperty(layer.keyframes, property, progress) ?? DEFAULT_VALUES[property]
  }
  return resolved
}
