import { vi } from 'vitest'
import { createLayer, createProject } from '../engine/document'
import { createShareHash, serializeProject } from '../engine/serialize'
import type { Project } from '../engine/types'
import { createInitialData, selectProject, useEditorStore } from './editorStore'
import {
  AUTOSAVE_DELAY_MS,
  STORAGE_KEY,
  getLocalStorage,
  initPersistence,
  loadSavedProject,
  saveProject,
  startAutosave,
} from './persistence'

function projectNamed(name: string): Project {
  return { ...createProject(), name, layers: [createLayer('a', 'rect', 'Box')] }
}

function brokenStorage(): Storage {
  const fail = (): never => {
    throw new Error('storage is blocked')
  }
  return { getItem: fail, setItem: fail } as unknown as Storage
}

function current(): Project {
  return selectProject(useEditorStore.getState())
}

beforeEach(() => {
  localStorage.clear()
  useEditorStore.setState(createInitialData())
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('getLocalStorage', () => {
  it('returns the browser localStorage', () => {
    expect(getLocalStorage()).toBe(window.localStorage)
  })
})

describe('loadSavedProject', () => {
  it('returns null without storage or when nothing was saved', () => {
    expect(loadSavedProject(null)).toBeNull()
    expect(loadSavedProject(localStorage)).toBeNull()
  })

  it('returns the saved project', () => {
    const project = projectNamed('Saved')
    localStorage.setItem(STORAGE_KEY, serializeProject(project))
    expect(loadSavedProject(localStorage)).toEqual(project)
  })

  it('returns null for text that is not a project instead of failing', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    expect(loadSavedProject(localStorage)).toBeNull()
    localStorage.setItem(STORAGE_KEY, '{"version": 1}')
    expect(loadSavedProject(localStorage)).toBeNull()
  })

  it('upgrades a project saved in an older version', () => {
    const legacy = { version: 0, name: 'Old', sceneLength: 2, layers: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const loaded = loadSavedProject(localStorage)
    expect(loaded?.version).toBe(1)
    expect(loaded?.aspectRatio).toEqual({ width: 16, height: 9 })
  })

  it('returns null when the browser blocks storage', () => {
    expect(loadSavedProject(brokenStorage())).toBeNull()
  })
})

describe('saveProject', () => {
  it('writes the project as JSON under the storage key', () => {
    const project = projectNamed('Saved')
    expect(saveProject(localStorage, project)).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(serializeProject(project))
  })

  it('returns false without storage or when the browser refuses', () => {
    expect(saveProject(null, projectNamed('x'))).toBe(false)
    expect(saveProject(brokenStorage(), projectNamed('x'))).toBe(false)
  })
})

describe('startAutosave', () => {
  it('saves a change after the delay, not before', () => {
    vi.useFakeTimers()
    const stop = startAutosave(localStorage)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(1)
    expect(loadSavedProject(localStorage)).toEqual(current())
    stop()
  })

  it('saves changes that come close together once, with the latest state', () => {
    vi.useFakeTimers()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const stop = startAutosave(localStorage)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    vi.advanceTimersByTime(300)
    useEditorStore.getState().updateLayer('a', { name: 'Renamed' })
    vi.advanceTimersByTime(300)
    expect(setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(loadSavedProject(localStorage)?.layers[0]?.name).toBe('Renamed')
    stop()
  })

  it('does not save for changes that are not part of the project', () => {
    vi.useFakeTimers()
    const stop = startAutosave(localStorage)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)
    localStorage.clear()
    useEditorStore.getState().setPlayhead(0.5)
    useEditorStore.getState().select(null)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    stop()
  })

  it('saves at once when the page is left', () => {
    vi.useFakeTimers()
    const stop = startAutosave(localStorage)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    window.dispatchEvent(new Event('pagehide'))
    expect(loadSavedProject(localStorage)).toEqual(current())
    stop()
  })

  it('writes nothing when the page is left without a change', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const stop = startAutosave(localStorage)
    window.dispatchEvent(new Event('pagehide'))
    expect(setItem).not.toHaveBeenCalled()
    stop()
  })

  it('stops saving once stopped', () => {
    vi.useFakeTimers()
    const stop = startAutosave(localStorage)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    stop()
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    window.dispatchEvent(new Event('pagehide'))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('keeps working when the browser refuses to save', () => {
    vi.useFakeTimers()
    const stop = startAutosave(brokenStorage())
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    expect(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)).not.toThrow()
    stop()
  })
})

describe('initPersistence', () => {
  async function init(hash = '', storage: Storage | null = localStorage) {
    const clearHash = vi.fn()
    const stop = await initPersistence({ storage, hash, clearHash })
    return { clearHash, stop }
  }

  it('starts with an empty project when nothing was saved', async () => {
    const { stop } = await init()
    expect(current()).toEqual(createProject())
    stop()
  })

  it('opens the project saved last time', async () => {
    localStorage.setItem(STORAGE_KEY, serializeProject(projectNamed('Saved')))
    const { stop } = await init()
    expect(current().name).toBe('Saved')
    stop()
  })

  it('opens a share link in preference to the saved project and clears the hash', async () => {
    localStorage.setItem(STORAGE_KEY, serializeProject(projectNamed('Saved')))
    const shared = await createShareHash(projectNamed('Shared'))
    if (!shared.ok) throw new Error(shared.error)
    const { clearHash, stop } = await init(shared.hash)
    expect(current().name).toBe('Shared')
    expect(clearHash).toHaveBeenCalledTimes(1)
    expect(useEditorStore.getState().notice).toBe('Opened the shared project.')
    stop()
  })

  it('does not overwrite the saved project just by opening a share link', async () => {
    const saved = serializeProject(projectNamed('Saved'))
    localStorage.setItem(STORAGE_KEY, saved)
    const shared = await createShareHash(projectNamed('Shared'))
    if (!shared.ok) throw new Error(shared.error)
    const { stop } = await init(shared.hash)
    window.dispatchEvent(new Event('pagehide'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved)
    stop()
  })

  it('falls back to the saved project and says so when the share link is bad', async () => {
    localStorage.setItem(STORAGE_KEY, serializeProject(projectNamed('Saved')))
    const { clearHash, stop } = await init('#share=1.AAAAAAAA')
    expect(current().name).toBe('Saved')
    expect(clearHash).toHaveBeenCalledTimes(1)
    expect(useEditorStore.getState().notice).toMatch(/^The share link could not be opened\. /)
    stop()
  })

  it('falls back to an empty project when the share link is bad and nothing was saved', async () => {
    const { stop } = await init('#share=1.!!!')
    expect(current()).toEqual(createProject())
    expect(useEditorStore.getState().notice).toContain('could not be opened')
    stop()
  })

  it('ignores a hash that is not a share link', async () => {
    const { clearHash, stop } = await init('#about')
    expect(clearHash).not.toHaveBeenCalled()
    expect(useEditorStore.getState().notice).toBeNull()
    stop()
  })

  it('works without storage', async () => {
    const { stop } = await init('', null)
    expect(current()).toEqual(createProject())
    stop()
  })

  it('autosaves later changes', async () => {
    const { stop } = await init()
    vi.useFakeTimers()
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)
    expect(loadSavedProject(localStorage)?.layers).toHaveLength(1)
    stop()
  })
})
