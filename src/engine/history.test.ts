import { canRedo, canUndo, commit, createHistory, redo, undo, type History } from './history'

function deepFreeze<T>(history: History<T>): History<T> {
  Object.freeze(history.past)
  Object.freeze(history.future)
  return Object.freeze(history)
}

function commitAll(history: History<number>, values: number[]): History<number> {
  return values.reduce(commit, history)
}

describe('createHistory', () => {
  it('starts with the initial state and nothing to undo or redo', () => {
    const history = createHistory(7)
    expect(history.present).toBe(7)
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
  })
})

describe('commit', () => {
  it('records the previous state and makes the new one current', () => {
    const history = commit(createHistory(0), 1)
    expect(history.present).toBe(1)
    expect(history.past).toEqual([0])
    expect(canUndo(history)).toBe(true)
  })

  it('does not record a state identical to the current one', () => {
    const history = commit(createHistory(0), 1)
    expect(commit(history, 1)).toBe(history)
  })

  it('does not mutate the history it is given', () => {
    const original = deepFreeze(createHistory(0))
    const next = commit(original, 1)
    expect(original.past).toEqual([])
    expect(original.present).toBe(0)
    expect(next).not.toBe(original)
  })
})

describe('undo and redo', () => {
  it('walks back and forth: 0,1,2,3 then undo, undo, redo gives 2, 1, 2', () => {
    let history = commitAll(createHistory(0), [1, 2, 3])
    history = undo(history)
    expect(history.present).toBe(2)
    history = undo(history)
    expect(history.present).toBe(1)
    history = redo(history)
    expect(history.present).toBe(2)
    expect(history.past).toEqual([0, 1])
    expect(history.future).toEqual([3])
  })

  it('undo then redo returns to the same present', () => {
    const start = commitAll(createHistory(0), [1, 2])
    expect(redo(undo(start)).present).toBe(start.present)
  })

  it('does nothing at the ends and returns the same history', () => {
    const fresh = createHistory(0)
    expect(undo(fresh)).toBe(fresh)
    expect(redo(fresh)).toBe(fresh)
  })

  it('does not mutate the history it is given', () => {
    const original = deepFreeze(commitAll(createHistory(0), [1, 2]))
    const undone = undo(original)
    expect(original.present).toBe(2)
    expect(original.past).toEqual([0, 1])
    expect(redo(deepFreeze(undone)).present).toBe(2)
  })

  it('works when the state itself can be undefined', () => {
    const history = undo(commit(createHistory<number | undefined>(undefined), 5))
    expect(history.present).toBeUndefined()
    expect(redo(history).present).toBe(5)
  })
})

describe('redo stack', () => {
  it('is cleared by a new edit', () => {
    let history = commitAll(createHistory(0), [1, 2])
    history = undo(history)
    expect(canRedo(history)).toBe(true)
    history = commit(history, 9)
    expect(canRedo(history)).toBe(false)
    expect(history.future).toEqual([])
    expect(undo(history).present).toBe(1)
  })
})

describe('depth limit', () => {
  it('keeps only the last 3 undo steps: committing 1..5 from 0 leaves past [2, 3, 4]', () => {
    const history = commitAll(createHistory(0, 3), [1, 2, 3, 4, 5])
    expect(history.past).toEqual([2, 3, 4])
    expect(history.present).toBe(5)
  })

  it('cannot undo further back than the limit', () => {
    let history = commitAll(createHistory(0, 3), [1, 2, 3, 4, 5])
    history = undo(undo(undo(history)))
    expect(history.present).toBe(2)
    expect(canUndo(history)).toBe(false)
  })

  it('a limit of 0 keeps no undo steps', () => {
    const history = commitAll(createHistory(0, 0), [1, 2])
    expect(history.present).toBe(2)
    expect(canUndo(history)).toBe(false)
  })

  it('uses a default limit of 100', () => {
    const history = commitAll(
      createHistory(0),
      Array.from({ length: 150 }, (_, index) => index + 1),
    )
    expect(history.past).toHaveLength(100)
    expect(history.past[0]).toBe(50)
  })
})
