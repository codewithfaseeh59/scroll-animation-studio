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
import type { Keyframe, Layer, Project } from '../engine/types'
import { clamp } from '../lib/clamp'

export interface EditorData {
  /** The project plus its undo/redo stacks. Only document edits go through it. */
  history: History<Project>
  selectedLayerId: string | null
  /** Scroll progress of the scrub preview, 0..1. Not part of undo/redo. */
  playhead: number
}

export interface EditorActions {
  select: (layerId: string | null) => void
  setPlayhead: (progress: number) => void
  /** Adds the layer and selects it. */
  addLayer: (layer: Layer) => void
  removeLayer: (layerId: string) => void
  updateLayer: (layerId: string, patch: ops.LayerPatch) => void
  upsertKeyframe: (layerId: string, keyframe: Keyframe) => void
  updateKeyframe: (layerId: string, keyframeId: string, patch: ops.KeyframePatch) => void
  removeKeyframe: (layerId: string, keyframeId: string) => void
  undo: () => void
  redo: () => void
  /** Replaces the whole project and clears history, selection and playhead. */
  loadProject: (project: Project) => void
}

export type EditorState = EditorData & EditorActions

export function createInitialData(project: Project = ops.createProject()): EditorData {
  return { history: createHistory(project), selectedLayerId: null, playhead: 0 }
}

function validSelection(project: Project, layerId: string | null): string | null {
  return layerId !== null && ops.getLayer(project, layerId) ? layerId : null
}

export const useEditorStore = create<EditorState>()((set) => {
  /** Applies a document change; a change that does nothing leaves the state untouched. */
  const edit = (change: (project: Project) => Project): void => {
    set((state) => {
      const history = commit(state.history, change(state.history.present))
      if (history === state.history) return state
      return { history, selectedLayerId: validSelection(history.present, state.selectedLayerId) }
    })
  }

  const travel = (move: (history: History<Project>) => History<Project>): void => {
    set((state) => {
      const history = move(state.history)
      if (history === state.history) return state
      return { history, selectedLayerId: validSelection(history.present, state.selectedLayerId) }
    })
  }

  return {
    ...createInitialData(),

    select: (layerId) => {
      set((state) => ({ selectedLayerId: validSelection(state.history.present, layerId) }))
    },
    setPlayhead: (progress) => {
      set({ playhead: clamp(progress, 0, 1) })
    },

    addLayer: (layer) => {
      set((state) => {
        const history = commit(state.history, ops.addLayer(state.history.present, layer))
        if (history === state.history) return state
        return { history, selectedLayerId: layer.id }
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
