import { useTheme } from '../../hooks/useTheme'
import { LayerList } from '../LayerList/LayerList'
import { Stage } from '../Stage/Stage'
import { Toolbar } from '../Toolbar/Toolbar'
import styles from './AppShell.module.css'

export function AppShell() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <Toolbar theme={theme} onToggleTheme={toggleTheme} />
      </div>
      <aside className={styles.layers} aria-label="Layers">
        <LayerList />
      </aside>
      <main className={styles.stage} aria-label="Stage">
        <Stage />
      </main>
      <aside className={styles.inspector} aria-label="Inspector" />
      <section className={styles.timeline} aria-label="Timeline" />
    </div>
  )
}
