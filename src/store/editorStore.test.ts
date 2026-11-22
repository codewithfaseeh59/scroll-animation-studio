import { createProject } from '../engine/document'
import type { Keyframe, Layer } from '../engine/types'
import {
  createInitialData,
  selectCanRedo,
  selectCanUndo,
  selectProject,
  selectSelectedLayer,
  useEditorStore,
} from './editorStore'

function makeLayer(id: string): Layer {
  return {
    id,
    name: `Layer ${id}`,
    type: 'rect',
    base: { x: 10, y: 20, width: 30, height: 40 },
    style: { color: '#ff0000', text: '', fontSize: 16, src: '', radius: 0 },
    keyframes: [],
  }
}

function keyframe(id: string, progress: number, opacity: number): Keyframe {
  return { id, progress, values: { opacity }, ease: 'linear' }
}

const store = useEditorStore

function layerIds(): string[] {
  return selectProject(store.getState()).layers.map((layer) => layer.id)
}

beforeEach(() => {
  store.setState(createInitialData())
})

describe('initial state', () => {
  it('has an empty project, no selection, playhead 0 and nothing to undo', () => {
    const state = store.getState()
    expect(selectProject(state).layers).toEqual([])
    expect(state.selectedLayerId).toBeNull()
    expect(state.playhead).toBe(0)
    expect(selectCanUndo(state)).toBe(false)
    expect(selectCanRedo(state)).toBe(false)
  })
})

describe('layers', () => {
  it('addLayer adds the layer and selects it', () => {
    store.getState().addLayer(makeLayer('a'))
    expect(layerIds()).toEqual(['a'])
    expect(store.getState().selectedLayerId).toBe('a')
    expect(selectSelectedLayer(store.getState())?.name).toBe('Layer a')
  })

  it('adding a duplicate id changes nothing and adds no undo step', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().select(null)
    const before = store.getState()
    store.getState().addLayer(makeLayer('a'))
    expect(store.getState()).toBe(before)
  })

  it('removeLayer clears the selection when the selected layer is removed', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().addLayer(makeLayer('b'))
    store.getState().removeLayer('b')
    expect(layerIds()).toEqual(['a'])
    expect(store.getState().selectedLayerId).toBeNull()
  })

  it('removeLayer keeps the selection when another layer is removed', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().addLayer(makeLayer('b'))
    store.getState().removeLayer('a')
    expect(store.getState().selectedLayerId).toBe('b')
  })

  it('updateLayer changes the layer', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().updateLayer('a', { base: { x: 55 } })
    expect(selectSelectedLayer(store.getState())?.base).toEqual({
      x: 55,
      y: 20,
      width: 30,
      height: 40,
    })
  })

  it('an edit that does nothing adds no undo step', () => {
    store.getState().addLayer(makeLayer('a'))
    const before = store.getState()
    store.getState().updateLayer('missing', { name: 'x' })
    expect(store.getState()).toBe(before)
  })
})

describe('selection', () => {
  it('select ignores ids that do not exist and null clears it', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().select('missing')
    expect(store.getState().selectedLayerId).toBeNull()
    store.getState().select('a')
    expect(store.getState().selectedLayerId).toBe('a')
    store.getState().select(null)
    expect(store.getState().selectedLayerId).toBeNull()
  })
})

describe('keyframes', () => {
  it('upsert, update and remove keep keyframes sorted', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().upsertKeyframe('a', keyframe('k1', 0.8, 1))
    store.getState().upsertKeyframe('a', keyframe('k2', 0.2, 0))
    expect(selectSelectedLayer(store.getState())?.keyframes.map((k) => k.progress)).toEqual([
      0.2, 0.8,
    ])
    store.getState().updateKeyframe('a', 'k2', { progress: 0.9 })
    expect(selectSelectedLayer(store.getState())?.keyframes.map((k) => k.id)).toEqual(['k1', 'k2'])
    store.getState().removeKeyframe('a', 'k1')
    expect(selectSelectedLayer(store.getState())?.keyframes.map((k) => k.id)).toEqual(['k2'])
  })
})

describe('playhead', () => {
  it('clamps to 0..1 and is not part of undo', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().setPlayhead(0.4)
    expect(store.getState().playhead).toBe(0.4)
    store.getState().setPlayhead(-1)
    expect(store.getState().playhead).toBe(0)
    store.getState().setPlayhead(2)
    expect(store.getState().playhead).toBe(1)
    store.getState().undo()
    expect(store.getState().playhead).toBe(1)
  })
})

describe('undo and redo', () => {
  it('undo reverts the last edit and redo brings it back', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().updateLayer('a', { name: 'Hero' })
    store.getState().undo()
    expect(selectSelectedLayer(store.getState())?.name).toBe('Layer a')
    expect(selectCanRedo(store.getState())).toBe(true)
    store.getState().redo()
    expect(selectSelectedLayer(store.getState())?.name).toBe('Hero')
  })

  it('undoing the creation of the selected layer clears the selection', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().undo()
    expect(layerIds()).toEqual([])
    expect(store.getState().selectedLayerId).toBeNull()
  })

  it('a new edit clears redo', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().undo()
    store.getState().addLayer(makeLayer('b'))
    expect(selectCanRedo(store.getState())).toBe(false)
  })

  it('undo and redo with nothing to do leave the state untouched', () => {
    const before = store.getState()
    store.getState().undo()
    store.getState().redo()
    expect(store.getState()).toBe(before)
  })
})

describe('loadProject', () => {
  it('replaces the project and resets history, selection and playhead', () => {
    store.getState().addLayer(makeLayer('a'))
    store.getState().setPlayhead(0.5)
    store.getState().loadProject({ ...createProject(), name: 'Loaded', layers: [makeLayer('z')] })
    const state = store.getState()
    expect(selectProject(state).name).toBe('Loaded')
    expect(layerIds()).toEqual(['z'])
    expect(state.selectedLayerId).toBeNull()
    expect(state.playhead).toBe(0)
    expect(selectCanUndo(state)).toBe(false)
  })
})
