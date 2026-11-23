import { useEditorStore } from '../../store/editorStore'
import styles from './Notice.module.css'

/** A short message from the editor, such as the result of an import, until it is dismissed. */
export function Notice() {
  const notice = useEditorStore((state) => state.notice)
  const setNotice = useEditorStore((state) => state.setNotice)

  return (
    <div role="status" className={notice === null ? styles.empty : styles.notice}>
      {notice !== null && (
        <>
          <span>{notice}</span>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setNotice(null)
            }}
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  )
}
