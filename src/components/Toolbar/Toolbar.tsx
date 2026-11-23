import { useRef, useState } from 'react'
import { useProjectIO } from '../../hooks/useProjectIO'
import type { Theme } from '../../hooks/useTheme'
import { useEditorStore } from '../../store/editorStore'
import { ExportDialog } from '../ExportDialog/ExportDialog'
import { NewProjectDialog } from '../NewProjectDialog/NewProjectDialog'
import { ShortcutsDialog } from '../ShortcutsDialog/ShortcutsDialog'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const togglePlay = useEditorStore((state) => state.togglePlay)
  const previewMode = useEditorStore((state) => state.previewMode)
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode)
  const [exportOpen, setExportOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const { importFile, copyShareLink } = useProjectIO()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className={styles.toolbar}>
      <h1 className={styles.title}>ScrollStudio</h1>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          setNewProjectOpen(true)
        }}
      >
        New project
      </button>
      <button type="button" className={styles.button} onClick={togglePlay}>
        {isPlaying ? 'Pause preview' : 'Play preview'}
      </button>
      <button
        type="button"
        className={styles.button}
        aria-pressed={previewMode === 'browser'}
        onClick={() => {
          setPreviewMode(previewMode === 'browser' ? 'editor' : 'browser')
        }}
      >
        Browser preview
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          fileInput.current?.click()
        }}
      >
        Import
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Project JSON file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void importFile(file)
        }}
      />
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          void copyShareLink()
        }}
      >
        Share
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          setExportOpen(true)
        }}
      >
        Export
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          setShortcutsOpen(true)
        }}
      >
        Shortcuts
      </button>
      <button type="button" className={styles.button} onClick={onToggleTheme}>
        Switch to {nextTheme} theme
      </button>
      {shortcutsOpen && (
        <ShortcutsDialog
          onClose={() => {
            setShortcutsOpen(false)
          }}
        />
      )}
      {newProjectOpen && (
        <NewProjectDialog
          onClose={() => {
            setNewProjectOpen(false)
          }}
        />
      )}
      {exportOpen && (
        <ExportDialog
          onClose={() => {
            setExportOpen(false)
          }}
        />
      )}
    </header>
  )
}
