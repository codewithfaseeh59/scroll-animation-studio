export const PROJECT_VERSION = 1

export const EASE_NAMES = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'power2In',
  'power2Out',
  'power2InOut',
  'sineInOut',
] as const

export type EaseName = (typeof EASE_NAMES)[number]

export const ANIMATABLE_PROPERTIES = [
  'translateX',
  'translateY',
  'scale',
  'rotate',
  'opacity',
  'blur',
] as const

export type AnimatableProperty = (typeof ANIMATABLE_PROPERTIES)[number]

export type KeyframeValues = Partial<Record<AnimatableProperty, number>>

export interface Keyframe {
  id: string
  /** Position on the scene scroll, from 0 (start) to 1 (end). */
  progress: number
  values: KeyframeValues
  /** Easing applied on the way INTO this keyframe from the previous one. */
  ease: EaseName
}

export const LAYER_TYPES = ['rect', 'text', 'image'] as const

export type LayerType = (typeof LAYER_TYPES)[number]

/** Position and size in percent of the stage. */
export interface LayerBase {
  x: number
  y: number
  width: number
  height: number
}

export interface LayerStyle {
  color: string
  text: string
  fontSize: number
  src: string
  radius: number
}

export interface Layer {
  id: string
  name: string
  type: LayerType
  base: LayerBase
  style: LayerStyle
  keyframes: Keyframe[]
}

export interface AspectRatio {
  width: number
  height: number
}

export interface Project {
  version: number
  name: string
  /** Scene length in viewport heights: 4 means 400vh. */
  sceneLength: number
  aspectRatio: AspectRatio
  layers: Layer[]
}
