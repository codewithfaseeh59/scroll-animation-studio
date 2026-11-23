import { useId, useState, type KeyboardEvent } from 'react'
import styles from './Field.module.css'

interface TextFieldProps {
  label: string
  value: string
  onCommit: (value: string) => void
  /** Text that fails this check is dropped and the old value comes back. */
  isValid?: (value: string) => boolean
}

/**
 * A labelled text input with the same commit rules as NumberField: the value
 * is committed on blur or Enter, and Escape cancels the edit.
 */
export function TextField({ label, value, onCommit, isValid }: TextFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (): void => {
    if (draft === null) return
    setDraft(null)
    if (draft === value) return
    if (isValid && !isValid(draft)) return
    onCommit(draft)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') setDraft(null)
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        type="text"
        value={draft ?? value}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
