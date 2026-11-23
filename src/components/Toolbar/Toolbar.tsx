import { useState } from 'react'
import type { Theme } from '../../hooks/useTheme'
import { useEditorStore } from '../../store/editorStore'
import { ExportDialog } from '../ExportDialog/ExportDialog'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const togglePlay = useEditorStore((state) => state.togglePlay)
  const [exportOpen, setExportOpen] = useState(false)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className={styles.toolbar}>
      <h1 className={styles.title}>ScrollStudio</h1>
      <button type="button" className={styles.button} onClick={togglePlay}>
        {isPlaying ? 'Pause preview' : 'Play preview'}
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
      <button type="button" className={styles.button} onClick={onToggleTheme}>
        Switch to {nextTheme} theme
      </button>
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
