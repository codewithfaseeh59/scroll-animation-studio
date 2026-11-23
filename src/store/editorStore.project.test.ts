import { createLayer, createProject } from '../engine/document'
import { createInitialData, selectCanUndo, selectProject, useEditorStore } from './editorStore'

const store = useEditorStore

beforeEach(() => {
  store.setState(createInitialData())
})

describe('replaceProject', () => {
  it('swaps the project and can be undone in one step', () => {
    store.getState().addLayer(createLayer('a', 'rect', 'Box'))
    const before = selectProject(store.getState())
    const incoming = {
      ...createProject(),
      name: 'Imported',
      layers: [createLayer('z', 'text', 'Title')],
    }
    store.getState().replaceProject(incoming)
    expect(selectProject(store.getState())).toBe(incoming)
    store.getState().undo()
    expect(selectProject(store.getState())).toBe(before)
  })

  it('clears a selection that points at a layer the new project does not have', () => {
    store.getState().addLayer(createLayer('a', 'rect', 'Box'))
    expect(store.getState().selectedLayerId).toBe('a')
    store
      .getState()
      .replaceProject({ ...createProject(), layers: [createLayer('z', 'rect', 'Other')] })
    expect(store.getState().selectedLayerId).toBeNull()
  })

  it('keeps the selection when the new project still has that layer', () => {
    store.getState().addLayer(createLayer('a', 'rect', 'Box'))
    store
      .getState()
      .replaceProject({ ...createProject(), layers: [createLayer('a', 'rect', 'Renamed')] })
    expect(store.getState().selectedLayerId).toBe('a')
  })

  it('does nothing for the project that is already there', () => {
    const state = store.getState()
    store.getState().replaceProject(selectProject(state))
    expect(store.getState()).toBe(state)
    expect(selectCanUndo(store.getState())).toBe(false)
  })

  it('leaves the playhead alone', () => {
    store.getState().setPlayhead(0.4)
    store.getState().replaceProject({ ...createProject(), name: 'Imported' })
    expect(store.getState().playhead).toBe(0.4)
  })
})

describe('notice', () => {
  it('starts empty, can be set and can be cleared', () => {
    expect(store.getState().notice).toBeNull()
    store.getState().setNotice('Imported.')
    expect(store.getState().notice).toBe('Imported.')
    store.getState().setNotice(null)
    expect(store.getState().notice).toBeNull()
  })

  it('is not part of undo', () => {
    store.getState().setNotice('Hello')
    expect(selectCanUndo(store.getState())).toBe(false)
  })

  it('is cleared when a project is loaded', () => {
    store.getState().setNotice('Hello')
    store.getState().loadProject(createProject())
    expect(store.getState().notice).toBeNull()
  })
})
