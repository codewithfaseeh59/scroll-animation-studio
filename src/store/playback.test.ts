import { createProject } from '../engine/document'
import { createInitialData, selectCanUndo, useEditorStore } from './editorStore'

const store = useEditorStore

beforeEach(() => {
  store.setState(createInitialData())
})

describe('playback state', () => {
  it('starts paused', () => {
    expect(store.getState().isPlaying).toBe(false)
  })

  it('play starts and pause stops without moving the playhead', () => {
    store.getState().setPlayhead(0.4)
    store.getState().play()
    expect(store.getState().isPlaying).toBe(true)
    expect(store.getState().playhead).toBe(0.4)
    store.getState().pause()
    expect(store.getState().isPlaying).toBe(false)
    expect(store.getState().playhead).toBe(0.4)
  })

  it('play from the end of the scene starts again at 0', () => {
    store.getState().setPlayhead(1)
    store.getState().play()
    expect(store.getState().playhead).toBe(0)
    expect(store.getState().isPlaying).toBe(true)
  })

  it('togglePlay switches between playing and paused', () => {
    store.getState().togglePlay()
    expect(store.getState().isPlaying).toBe(true)
    store.getState().togglePlay()
    expect(store.getState().isPlaying).toBe(false)
  })

  it('is not part of undo', () => {
    store.getState().play()
    store.getState().pause()
    expect(selectCanUndo(store.getState())).toBe(false)
  })

  it('loadProject stops playback', () => {
    store.getState().play()
    store.getState().loadProject(createProject())
    expect(store.getState().isPlaying).toBe(false)
  })
})

describe('preview mode', () => {
  it('starts in the editor', () => {
    expect(store.getState().previewMode).toBe('editor')
  })

  it('switches to the browser preview and back', () => {
    store.getState().setPreviewMode('browser')
    expect(store.getState().previewMode).toBe('browser')
    store.getState().setPreviewMode('editor')
    expect(store.getState().previewMode).toBe('editor')
  })

  it('the browser preview stops playback', () => {
    store.getState().play()
    store.getState().setPreviewMode('browser')
    expect(store.getState().isPlaying).toBe(false)
  })

  it('going back to the editor does not start playback', () => {
    store.getState().setPreviewMode('browser')
    store.getState().setPreviewMode('editor')
    expect(store.getState().isPlaying).toBe(false)
  })

  it('is not part of undo', () => {
    store.getState().setPreviewMode('browser')
    expect(selectCanUndo(store.getState())).toBe(false)
  })
})
