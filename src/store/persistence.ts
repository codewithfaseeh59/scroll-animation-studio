import { parseProject, isShareHash, readShareHash, serializeProject } from '../engine/serialize'
import type { Project } from '../engine/types'
import { selectProject, useEditorStore } from './editorStore'

export const STORAGE_KEY = 'scrollstudio.project'
export const AUTOSAVE_DELAY_MS = 500

/** The browser's localStorage, or null when it is not available (blocked, private window). */
export function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** The project saved last time, or null when there is none or it cannot be read. */
export function loadSavedProject(storage: Storage | null): Project | null {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    if (text === null || text === undefined) return null
    const result = parseProject(text)
    return result.ok ? result.project : null
  } catch {
    return null
  }
}

/** Saves the project. Returns false when the browser refuses (storage full or blocked). */
export function saveProject(storage: Storage | null, project: Project): boolean {
  try {
    if (!storage) return false
    storage.setItem(STORAGE_KEY, serializeProject(project))
    return true
  } catch {
    return false
  }
}

/**
 * Saves the project shortly after every change to it. Changes that come close
 * together are saved once. Leaving the page saves at once. Returns a function
 * that stops all of this.
 */
export function startAutosave(storage: Storage | null, delayMs = AUTOSAVE_DELAY_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false

  const flush = (): void => {
    clearTimeout(timer)
    timer = undefined
    if (!pending) return
    pending = false
    saveProject(storage, selectProject(useEditorStore.getState()))
  }

  let previous = selectProject(useEditorStore.getState())
  const unsubscribe = useEditorStore.subscribe((state) => {
    const project = selectProject(state)
    if (project === previous) return
    previous = project
    pending = true
    clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  })
  window.addEventListener('pagehide', flush)

  return () => {
    unsubscribe()
    window.removeEventListener('pagehide', flush)
    clearTimeout(timer)
  }
}

interface InitOptions {
  storage: Storage | null
  /** The current URL hash, such as "#share=1.abc" or "". */
  hash: string
  /** Called after a share link has been handled, to take it out of the address bar. */
  clearHash: () => void
}

/**
 * Starts the editor with the right project: from a share link in the URL if
 * there is one, otherwise the project saved last time, otherwise an empty one.
 * A share link that cannot be opened is reported and the saved project is used.
 * Then autosave begins. Returns the function that stops autosave.
 */
export async function initPersistence({
  storage,
  hash,
  clearHash,
}: InitOptions): Promise<() => void> {
  const { loadProject, setNotice } = useEditorStore.getState()
  let shareError: string | null = null

  if (isShareHash(hash)) {
    const shared = await readShareHash(hash)
    clearHash()
    if (shared.ok) {
      loadProject(shared.project)
      setNotice('Opened the shared project.')
      return startAutosave(storage)
    }
    shareError = shared.error
  }

  const saved = loadSavedProject(storage)
  if (saved) loadProject(saved)
  if (shareError !== null) setNotice(`The share link could not be opened. ${shareError}`)
  return startAutosave(storage)
}
