export const DEFAULT_HISTORY_LIMIT = 100

export interface History<T> {
  /** Older states, oldest first. Never longer than `limit`. */
  past: readonly T[]
  present: T
  /** States that were undone, the next one to redo first. */
  future: readonly T[]
  /** How many undo steps are kept. A non-negative integer. */
  limit: number
}

export function createHistory<T>(initial: T, limit: number = DEFAULT_HISTORY_LIMIT): History<T> {
  return { past: [], present: initial, future: [], limit }
}

/**
 * Records a new state. A state identical (same reference) to the current one
 * is not recorded, so document operations that changed nothing add no undo
 * step. A real edit clears the redo stack and drops the oldest undo step once
 * the limit is exceeded.
 */
export function commit<T>(history: History<T>, next: T): History<T> {
  if (Object.is(next, history.present)) return history
  const past = [...history.past, history.present]
  return {
    ...history,
    past: past.length > history.limit ? past.slice(past.length - history.limit) : past,
    present: next,
    future: [],
  }
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0
}

export function undo<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1] as T
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history
  const next = history.future[0] as T
  return {
    ...history,
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}
