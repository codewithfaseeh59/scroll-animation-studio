import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { copyText } from '../../lib/clipboard'
import { downloadText } from '../../lib/download'
import { selectProject, useEditorStore } from '../../store/editorStore'
import styles from './ExportDialog.module.css'
import { buildExportTabs, type ExportFile } from './exportFiles'

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const INITIAL_TAB = 'css'

type CopyStatus = 'idle' | 'copied' | 'failed'

function ExportFileView({ file }: { file: ExportFile }) {
  const [status, setStatus] = useState<CopyStatus>('idle')

  const handleCopy = (): void => {
    void copyText(file.content).then((copied) => {
      setStatus(copied ? 'copied' : 'failed')
    })
  }

  return (
    <section className={styles.file} aria-label={file.name}>
      <div className={styles.fileHeader}>
        <h3 className={styles.fileName}>
          {file.label} <span className={styles.muted}>{file.name}</span>
        </h3>
        <div className={styles.fileActions}>
          <span role="status" className={styles.status}>
            {status === 'copied' && 'Copied'}
            {status === 'failed' && 'Copy failed'}
          </span>
          <button type="button" className={styles.button} onClick={handleCopy}>
            Copy {file.name}
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              downloadText(file.name, file.content, file.mime)
            }}
          >
            Download {file.name}
          </button>
        </div>
      </div>
      <pre className={styles.code}>
        <code>{file.content}</code>
      </pre>
    </section>
  )
}

interface ExportDialogProps {
  onClose: () => void
}

/**
 * A modal dialog with one tab per export format. Escape or a press on the
 * backdrop closes it, Tab stays inside it, and focus returns to where it was.
 */
export function ExportDialog({ onClose }: ExportDialogProps) {
  const project = useEditorStore(selectProject)
  const tabs = useMemo(() => buildExportTabs(project), [project])
  const [activeId, setActiveId] = useState<string>(INITIAL_TAB)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  useEffect(() => {
    // When the dialog opens, focus moves to the first tab, which is the open one.
    const opener = document.activeElement
    tabRefs.current[INITIAL_TAB]?.focus()
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  const selectTab = (index: number): void => {
    const next = tabs[(index + tabs.length) % tabs.length]
    if (!next) return
    setActiveId(next.id)
    tabRefs.current[next.id]?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }
    const target = moves[event.key]
    if (target === undefined) return
    event.preventDefault()
    selectTab(target)
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleDialogKeyDown}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Export
          </h2>
          <button type="button" className={styles.button} onClick={onClose}>
            Close
          </button>
        </div>
        <div role="tablist" aria-label="Export format" className={styles.tabs}>
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element
              }}
              type="button"
              role="tab"
              id={`${titleId}-tab-${tab.id}`}
              aria-selected={tab.id === active?.id}
              aria-controls={`${titleId}-panel`}
              tabIndex={tab.id === active?.id ? 0 : -1}
              className={styles.tab}
              onClick={() => {
                setActiveId(tab.id)
              }}
              onKeyDown={(event) => {
                handleTabKeyDown(event, index)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {active && (
          <div
            role="tabpanel"
            id={`${titleId}-panel`}
            aria-labelledby={`${titleId}-tab-${active.id}`}
            className={styles.panel}
          >
            {active.note && <p className={styles.note}>{active.note}</p>}
            {active.files.map((file) => (
              <ExportFileView key={`${active.id}-${file.name}`} file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
