import { useId, useState, type KeyboardEvent } from 'react'
import styles from './Field.module.css'

interface NumberFieldProps {
  label: string
  value: number
  onCommit: (value: number) => void
  min?: number
  step?: number
}

/**
 * A labelled number input. Typing only changes a local draft; the value is
 * committed when the input loses focus or Enter is pressed, so one edit is one
 * undo step. Text that is not a number is dropped and the old value comes back.
 * A value below `min` is raised to `min`. Escape cancels the edit.
 */
export function NumberField({ label, value, onCommit, min, step = 1 }: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (): void => {
    if (draft === null) return
    setDraft(null)
    const parsed = draft.trim() === '' ? Number.NaN : Number(draft)
    if (!Number.isFinite(parsed)) return
    const next = min === undefined ? parsed : Math.max(min, parsed)
    if (next !== value) onCommit(next)
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
        type="number"
        step={step}
        min={min}
        value={draft ?? String(value)}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
