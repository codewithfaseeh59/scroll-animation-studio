import { usePlayback } from '../../hooks/usePlayback'
import { useTheme } from '../../hooks/useTheme'
import { useEditorStore } from '../../store/editorStore'
import { BrowserPreview } from '../BrowserPreview/BrowserPreview'
import { Inspector } from '../Inspector/Inspector'
import { LayerList } from '../LayerList/LayerList'
import { Notice } from '../Notice/Notice'
import { Stage } from '../Stage/Stage'
import { Timeline } from '../Timeline/Timeline'
import { Toolbar } from '../Toolbar/Toolbar'
import styles from './AppShell.module.css'

export function AppShell() {
  const { theme, toggleTheme } = useTheme()
  usePlayback()
  const previewMode = useEditorStore((state) => state.previewMode)

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <Toolbar theme={theme} onToggleTheme={toggleTheme} />
      </div>
      <aside className={styles.layers} aria-label="Layers">
        <LayerList />
      </aside>
      <main className={styles.stage} aria-label="Stage">
        {previewMode === 'browser' ? <BrowserPreview /> : <Stage />}
      </main>
      <aside className={styles.inspector} aria-label="Inspector">
        <Inspector />
      </aside>
      <section className={styles.timeline} aria-label="Timeline">
        <Timeline />
      </section>
      <Notice />
    </div>
  )
}
