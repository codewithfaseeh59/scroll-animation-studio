import {
  PROJECT_VERSION,
  type EaseName,
  type Keyframe,
  type KeyframeValues,
  type Layer,
  type LayerBase,
  type Project,
} from '../engine/types'

/** A keyframe. The ease shapes the way into it from the keyframe before. */
export function key(
  id: string,
  progress: number,
  values: KeyframeValues,
  ease: EaseName = 'linear',
): Keyframe {
  return { id, progress, values, ease }
}

export function rect(
  id: string,
  name: string,
  base: LayerBase,
  color: string,
  options: { radius?: number; keyframes?: Keyframe[] } = {},
): Layer {
  return {
    id,
    name,
    type: 'rect',
    base,
    style: { color, text: '', fontSize: 16, src: '', radius: options.radius ?? 0 },
    keyframes: options.keyframes ?? [],
  }
}

export function text(
  id: string,
  name: string,
  base: LayerBase,
  content: string,
  fontSize: number,
  color: string,
  keyframes: Keyframe[] = [],
): Layer {
  return {
    id,
    name,
    type: 'text',
    base,
    style: { color, text: content, fontSize, src: '', radius: 0 },
    keyframes,
  }
}

/** A 16:9 project. */
export function project(name: string, sceneLength: number, layers: Layer[]): Project {
  return {
    version: PROJECT_VERSION,
    name,
    sceneLength,
    aspectRatio: { width: 16, height: 9 },
    layers,
  }
}

/** A rectangle that fills the whole stage, for a background. */
export function backgroundLayer(color: string): Layer {
  return rect('background', 'Background', { x: 0, y: 0, width: 100, height: 100 }, color)
}
