import { SHORTCUTS } from '../../lib/shortcuts'
import { Modal } from '../ui/Modal'
import styles from './ShortcutsDialog.module.css'

/** A list of the keyboard shortcuts. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.note}>
          Shortcuts work when you are not typing in a field. Hold Shift with an arrow key to move
          10% at a time.
        </p>
        <dl className={styles.list}>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className={styles.row}>
              <dt>
                <kbd className={styles.keys}>{shortcut.keys}</kbd>
              </dt>
              <dd className={styles.description}>{shortcut.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  )
}
