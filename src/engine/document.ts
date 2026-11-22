import { clamp } from '../lib/clamp'
import {
  PROJECT_VERSION,
  type EaseName,
  type Keyframe,
  type KeyframeValues,
  type Layer,
  type LayerBase,
  type LayerStyle,
  type Project,
} from './types'

/** Two keyframes closer than this on the progress axis count as the same moment. */
export const PROGRESS_EPSILON = 1e-6

export interface LayerPatch {
  name?: string
  base?: Partial<LayerBase>
  style?: Partial<LayerStyle>
}

export interface KeyframePatch {
  progress?: number
  /** Replaces the whole values object. */
  values?: KeyframeValues
  ease?: EaseName
}

/*
 * Every operation is pure: it never mutates its input and returns a new
 * project. Parts that did not change keep their identity. When an operation
 * cannot apply (unknown id, duplicate id, two keyframes on the same progress)
 * it returns the project it was given, unchanged.
 */

export function createProject(): Project {
  return {
    version: PROJECT_VERSION,
    name: 'Untitled',
    sceneLength: 4,
    aspectRatio: { width: 16, height: 9 },
    layers: [],
  }
}

export function getLayer(project: Project, layerId: string): Layer | undefined {
  return project.layers.find((layer) => layer.id === layerId)
}

export function addLayer(project: Project, layer: Layer): Project {
  if (getLayer(project, layer.id)) return project
  return { ...project, layers: [...project.layers, layer] }
}

/** Removes the layer together with its keyframes, which live inside it. */
export function removeLayer(project: Project, layerId: string): Project {
  if (!getLayer(project, layerId)) return project
  return { ...project, layers: project.layers.filter((layer) => layer.id !== layerId) }
}

function mapLayer(project: Project, layerId: string, change: (layer: Layer) => Layer): Project {
  const layer = getLayer(project, layerId)
  if (!layer) return project
  const changed = change(layer)
  if (changed === layer) return project
  return { ...project, layers: project.layers.map((item) => (item === layer ? changed : item)) }
}

function sortByProgress(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.progress - b.progress)
}

function sameMoment(a: number, b: number): boolean {
  return Math.abs(a - b) < PROGRESS_EPSILON
}

export function updateLayer(project: Project, layerId: string, patch: LayerPatch): Project {
  return mapLayer(project, layerId, (layer) => ({
    ...layer,
    name: patch.name ?? layer.name,
    base: { ...layer.base, ...patch.base },
    style: { ...layer.style, ...patch.style },
  }))
}

/**
 * Auto-key operation. If the layer already has a keyframe at this progress,
 * the given values are merged into it (its id and ease are kept). Otherwise
 * the keyframe is inserted in sorted position. Progress is clamped to 0..1.
 */
export function upsertKeyframe(project: Project, layerId: string, keyframe: Keyframe): Project {
  const progress = clamp(keyframe.progress, 0, 1)
  return mapLayer(project, layerId, (layer) => {
    const existing = layer.keyframes.find((item) => sameMoment(item.progress, progress))
    if (existing) {
      const merged = { ...existing, values: { ...existing.values, ...keyframe.values } }
      return {
        ...layer,
        keyframes: layer.keyframes.map((item) => (item === existing ? merged : item)),
      }
    }
    if (layer.keyframes.some((item) => item.id === keyframe.id)) return layer
    return { ...layer, keyframes: sortByProgress([...layer.keyframes, { ...keyframe, progress }]) }
  })
}

/**
 * Changes a keyframe. Moving it onto another keyframe's progress is refused.
 * Progress is clamped to 0..1 and the keyframes are re-sorted.
 */
export function updateKeyframe(
  project: Project,
  layerId: string,
  keyframeId: string,
  patch: KeyframePatch,
): Project {
  return mapLayer(project, layerId, (layer) => {
    const target = layer.keyframes.find((item) => item.id === keyframeId)
    if (!target) return layer
    const progress = patch.progress === undefined ? target.progress : clamp(patch.progress, 0, 1)
    const collides = layer.keyframes.some(
      (item) => item !== target && sameMoment(item.progress, progress),
    )
    if (collides) return layer
    const updated: Keyframe = {
      ...target,
      progress,
      values: patch.values ?? target.values,
      ease: patch.ease ?? target.ease,
    }
    return {
      ...layer,
      keyframes: sortByProgress(layer.keyframes.map((item) => (item === target ? updated : item))),
    }
  })
}

export function removeKeyframe(project: Project, layerId: string, keyframeId: string): Project {
  return mapLayer(project, layerId, (layer) => {
    if (!layer.keyframes.some((item) => item.id === keyframeId)) return layer
    return { ...layer, keyframes: layer.keyframes.filter((item) => item.id !== keyframeId) }
  })
}
