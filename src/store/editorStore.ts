import { create } from 'zustand'
import * as ops from '../engine/document'
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
  type History,
} from '../engine/history'
import type { Keyframe, KeyframeValues, Layer, Project } from '../engine/types'
import { clamp } from '../lib/clamp'
import { createId } from '../lib/id'

export interface EditorData {
  /** The project plus its undo/redo stacks. Only document edits go through it. */
  history: History<Project>
  selectedLayerId: string | null
  /** A keyframe of the selected layer, or null. */
  selectedKeyframeId: string | null
  /** Scroll progress of the scrub preview, 0..1. Not part of undo/redo. */
  playhead: number
}

export interface EditorActions {
  /** Selects a layer, or nothing. Clears the keyframe selection. */
  select: (layerId: string | null) => void
  /** Selects a keyframe together with its layer. Unknown ids are ignored. */
  selectKeyframe: (layerId: string, keyframeId: string) => void
  setPlayhead: (progress: number) => void
  /** Adds the layer and selects it. */
  addLayer: (layer: Layer) => void
  removeLayer: (layerId: string) => void
  updateLayer: (layerId: string, patch: ops.LayerPatch) => void
  upsertKeyframe: (layerId: string, keyframe: Keyframe) => void
  updateKeyframe: (layerId: string, keyframeId: string, patch: ops.KeyframePatch) => void
  removeKeyframe: (layerId: string, keyframeId: string) => void
  /**
   * Auto-key: sets values on the layer at the playhead. A keyframe is created
   * there, or updated when one already sits at that progress.
   */
  autoKey: (layerId: string, values: KeyframeValues) => void
  undo: () => void
  redo: () => void
  /** Replaces the whole project and clears history, selection and playhead. */
  loadProject: (project: Project) => void
}

export type EditorState = EditorData & EditorActions

export function createInitialData(project: Project = ops.createProject()): EditorData {
  return {
    history: createHistory(project),
    selectedLayerId: null,
    selectedKeyframeId: null,
    playhead: 0,
  }
}

interface Selection {
  selectedLayerId: string | null
  selectedKeyframeId: string | null
}

/** Drops the parts of a selection that no longer exist in the project. */
function validSelection(project: Project, selection: Selection): Selection {
  const layer =
    selection.selectedLayerId === null
      ? undefined
      : ops.getLayer(project, selection.selectedLayerId)
  if (!layer) return { selectedLayerId: null, selectedKeyframeId: null }
  const hasKeyframe = layer.keyframes.some(
    (keyframe) => keyframe.id === selection.selectedKeyframeId,
  )
  return {
    selectedLayerId: layer.id,
    selectedKeyframeId: hasKeyframe ? selection.selectedKeyframeId : null,
  }
}

export const useEditorStore = create<EditorState>()((set) => {
  /** Applies a document change; a change that does nothing leaves the state untouched. */
  const edit = (change: (project: Project) => Project): void => {
    set((state) => {
      const history = commit(state.history, change(state.history.present))
      if (history === state.history) return state
      return { history, ...validSelection(history.present, state) }
    })
  }

  const travel = (move: (history: History<Project>) => History<Project>): void => {
    set((state) => {
      const history = move(state.history)
      if (history === state.history) return state
      return { history, ...validSelection(history.present, state) }
    })
  }

  return {
    ...createInitialData(),

    select: (layerId) => {
      set((state) => ({
        ...validSelection(state.history.present, {
          selectedLayerId: layerId,
          selectedKeyframeId: null,
        }),
      }))
    },
    selectKeyframe: (layerId, keyframeId) => {
      set((state) => {
        const selection = validSelection(state.history.present, {
          selectedLayerId: layerId,
          selectedKeyframeId: keyframeId,
        })
        return selection.selectedKeyframeId === null ? state : selection
      })
    },
    setPlayhead: (progress) => {
      set({ playhead: clamp(progress, 0, 1) })
    },

    addLayer: (layer) => {
      set((state) => {
        const history = commit(state.history, ops.addLayer(state.history.present, layer))
        if (history === state.history) return state
        return { history, selectedLayerId: layer.id, selectedKeyframeId: null }
      })
    },
    removeLayer: (layerId) => {
      edit((project) => ops.removeLayer(project, layerId))
    },
    updateLayer: (layerId, patch) => {
      edit((project) => ops.updateLayer(project, layerId, patch))
    },
    upsertKeyframe: (layerId, keyframe) => {
      edit((project) => ops.upsertKeyframe(project, layerId, keyframe))
    },
    updateKeyframe: (layerId, keyframeId, patch) => {
      edit((project) => ops.updateKeyframe(project, layerId, keyframeId, patch))
    },
    removeKeyframe: (layerId, keyframeId) => {
      edit((project) => ops.removeKeyframe(project, layerId, keyframeId))
    },

    autoKey: (layerId, values) => {
      edit((project) =>
        ops.upsertKeyframe(project, layerId, {
          id: createId(),
          progress: useEditorStore.getState().playhead,
          values,
          ease: 'linear',
        }),
      )
    },

    undo: () => {
      travel(undo)
    },
    redo: () => {
      travel(redo)
    },
    loadProject: (project) => {
      set(createInitialData(project))
    },
  }
})

export const selectProject = (state: EditorState): Project => state.history.present

export const selectSelectedLayer = (state: EditorState): Layer | undefined =>
  state.selectedLayerId === null
    ? undefined
    : ops.getLayer(state.history.present, state.selectedLayerId)

export const selectCanUndo = (state: EditorState): boolean => canUndo(state.history)

export const selectCanRedo = (state: EditorState): boolean => canRedo(state.history)
