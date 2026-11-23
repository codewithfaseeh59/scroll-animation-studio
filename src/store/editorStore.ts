import { create } from 'zustand'
import * as ops from '../engine/document'
import {
  amend,
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
  type History,
} from '../engine/history'
import { interpolateLayer } from '../engine/interpolate'
import type { Keyframe, KeyframeValues, Layer, Project } from '../engine/types'
import { clamp } from '../lib/clamp'
import { createId } from '../lib/id'
import { roundTo } from '../lib/round'

/** Small edits of the same kind that come within this many milliseconds are one undo step. */
export const MERGE_WINDOW_MS = 1000

export interface EditorData {
  /** The project plus its undo/redo stacks. Only document edits go through it. */
  history: History<Project>
  selectedLayerId: string | null
  /** A keyframe of the selected layer, or null. */
  selectedKeyframeId: string | null
  /** Scroll progress of the scrub preview, 0..1. Not part of undo/redo. */
  playhead: number
  /** Whether the preview is playing on its own. Not part of undo/redo. */
  isPlaying: boolean
  /** What the middle of the editor shows: the editable stage or the real exported CSS. */
  previewMode: PreviewMode
  /** A short message for the user, such as the result of an import. Null when there is none. */
  notice: string | null
  /** The last edit that later edits of the same kind may join, so a burst is one undo step. */
  mergeable: { key: string; at: number } | null
}

export type PreviewMode = 'editor' | 'browser'

export interface EditorActions {
  /** Selects a layer, or nothing. Clears the keyframe selection. */
  select: (layerId: string | null) => void
  /** Selects a keyframe together with its layer. Unknown ids are ignored. */
  selectKeyframe: (layerId: string, keyframeId: string) => void
  setPlayhead: (progress: number) => void
  /** Starts playing the preview. From the end of the scene it starts again at 0. */
  play: () => void
  pause: () => void
  togglePlay: () => void
  /** Switches between the editor stage and the browser preview. The browser preview stops playback. */
  setPreviewMode: (mode: PreviewMode) => void
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
  /** Adds a keyframe at the playhead that holds all of the layer's values at that moment. */
  addKeyframe: (layerId: string) => void
  /** Moves the layer by dx and dy percent of the stage. A burst of moves is one undo step. */
  nudgeLayer: (layerId: string, dx: number, dy: number) => void
  /** Moves a keyframe along the timeline by delta of the scene. A burst is one undo step. */
  shiftKeyframe: (layerId: string, keyframeId: string, delta: number) => void
  undo: () => void
  redo: () => void
  /** Replaces the whole project and clears history, selection and playhead. */
  loadProject: (project: Project) => void
  /** Replaces the whole project as one edit, so it can be undone. */
  replaceProject: (project: Project) => void
  setNotice: (message: string | null) => void
}

export type EditorState = EditorData & EditorActions

export function createInitialData(project: Project = ops.createProject()): EditorData {
  return {
    history: createHistory(project),
    selectedLayerId: null,
    selectedKeyframeId: null,
    playhead: 0,
    isPlaying: false,
    previewMode: 'editor',
    notice: null,
    mergeable: null,
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
      return { history, mergeable: null, ...validSelection(history.present, state) }
    })
  }

  /** Like edit, but an edit with the same key shortly after the last one joins it. */
  const mergedEdit = (key: string, change: (project: Project) => Project): void => {
    set((state) => {
      const next = change(state.history.present)
      if (next === state.history.present) return state
      const now = Date.now()
      const merging =
        state.mergeable !== null &&
        state.mergeable.key === key &&
        now - state.mergeable.at <= MERGE_WINDOW_MS
      const history = merging ? amend(state.history, next) : commit(state.history, next)
      return { history, mergeable: { key, at: now }, ...validSelection(history.present, state) }
    })
  }

  const travel = (move: (history: History<Project>) => History<Project>): void => {
    set((state) => {
      const history = move(state.history)
      if (history === state.history) return state
      return { history, mergeable: null, ...validSelection(history.present, state) }
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
    play: () => {
      set((state) => ({ isPlaying: true, playhead: state.playhead >= 1 ? 0 : state.playhead }))
    },
    pause: () => {
      set({ isPlaying: false })
    },
    setPreviewMode: (mode) => {
      set((state) => ({
        previewMode: mode,
        isPlaying: mode === 'browser' ? false : state.isPlaying,
      }))
    },
    togglePlay: () => {
      const { isPlaying, play, pause } = useEditorStore.getState()
      if (isPlaying) pause()
      else play()
    },

    addLayer: (layer) => {
      set((state) => {
        const history = commit(state.history, ops.addLayer(state.history.present, layer))
        if (history === state.history) return state
        return { history, mergeable: null, selectedLayerId: layer.id, selectedKeyframeId: null }
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

    addKeyframe: (layerId) => {
      const { history, playhead, autoKey } = useEditorStore.getState()
      const layer = ops.getLayer(history.present, layerId)
      if (layer) autoKey(layerId, interpolateLayer(layer, playhead))
    },
    nudgeLayer: (layerId, dx, dy) => {
      mergedEdit(`nudge:${layerId}`, (project) => {
        const layer = ops.getLayer(project, layerId)
        if (!layer || (dx === 0 && dy === 0)) return project
        const { x, y } = layer.base
        return ops.updateLayer(project, layerId, {
          base: { x: roundTo(x + dx, 2), y: roundTo(y + dy, 2) },
        })
      })
    },
    shiftKeyframe: (layerId, keyframeId, delta) => {
      mergedEdit(`shift:${keyframeId}`, (project) => {
        const keyframe = ops.getLayer(project, layerId)?.keyframes.find((k) => k.id === keyframeId)
        if (!keyframe) return project
        const progress = clamp(roundTo(keyframe.progress + delta, 3), 0, 1)
        if (progress === keyframe.progress) return project
        return ops.updateKeyframe(project, layerId, keyframeId, { progress })
      })
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
    replaceProject: (project) => {
      edit(() => project)
    },
    setNotice: (message) => {
      set({ notice: message })
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
