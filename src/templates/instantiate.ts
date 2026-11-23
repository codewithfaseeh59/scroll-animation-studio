import type { Project } from '../engine/types'
import { createId } from '../lib/id'

/**
 * A copy of the project that shares nothing with it: every layer and keyframe
 * gets a new id, so the same template can be loaded again and again without
 * two projects ever using the same ids. Ids are made in document order (a
 * layer, then its keyframes).
 */
export function instantiateProject(project: Project, makeId: () => string = createId): Project {
  return {
    ...project,
    aspectRatio: { ...project.aspectRatio },
    layers: project.layers.map((layer) => ({
      ...layer,
      id: makeId(),
      base: { ...layer.base },
      style: { ...layer.style },
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        id: makeId(),
        values: { ...keyframe.values },
      })),
    })),
  }
}
