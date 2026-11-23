import { MAX_FILE_BYTES, createShareHash, parseProject } from '../engine/serialize'
import { copyText } from '../lib/clipboard'
import { readFileText } from '../lib/readFile'
import { selectProject, useEditorStore } from '../store/editorStore'

/**
 * Bringing a project in from a file and sending it out as a link. Results are
 * reported through the editor's notice, never thrown.
 */
export function useProjectIO(): {
  importFile: (file: File) => Promise<void>
  copyShareLink: () => Promise<void>
} {
  const replaceProject = useEditorStore((state) => state.replaceProject)
  const setNotice = useEditorStore((state) => state.setNotice)

  const importFile = async (file: File): Promise<void> => {
    if (file.size > MAX_FILE_BYTES) {
      setNotice(`Could not import ${file.name}: the file is too large.`)
      return
    }
    let text: string
    try {
      text = await readFileText(file)
    } catch {
      setNotice(`Could not import ${file.name}: the file could not be read.`)
      return
    }
    const result = parseProject(text)
    if (!result.ok) {
      setNotice(`Could not import ${file.name}: ${result.error}`)
      return
    }
    replaceProject(result.project)
    setNotice(`Imported ${file.name}. Undo brings your previous project back.`)
  }

  const copyShareLink = async (): Promise<void> => {
    const shared = await createShareHash(selectProject(useEditorStore.getState()))
    if (!shared.ok) {
      setNotice(shared.error)
      return
    }
    const link = `${window.location.origin}${window.location.pathname}${window.location.search}${shared.hash}`
    if (await copyText(link)) {
      setNotice('Share link copied to the clipboard.')
      return
    }
    window.history.replaceState(null, '', link)
    setNotice('The link could not be copied automatically. It is now in the address bar.')
  }

  return { importFile, copyShareLink }
}
