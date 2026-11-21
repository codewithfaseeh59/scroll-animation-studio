import type { Theme } from '../../hooks/useTheme'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return (
    <header className={styles.toolbar}>
      <h1 className={styles.title}>ScrollStudio</h1>
      <button type="button" className={styles.button} onClick={onToggleTheme}>
        Switch to {nextTheme} theme
      </button>
    </header>
  )
}
