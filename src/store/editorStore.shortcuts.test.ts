import { vi } from 'vitest'
import { createLayer, createProject, getLayer } from '../engine/document'
import type { Keyframe, Layer } from '../engine/types'
import {
  MERGE_WINDOW_MS,
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from './editorStore'

const store = useEditorStore

function baseOf(id: string): { x: number; y: number } {
  const base = getLayer(selectProject(store.getState()), id)?.base
  if (!base) throw new Error(`layer ${id} missing`)
  return { x: base.x, y: base.y }
}

function pastLength(): number {
  return store.getState().history.past.length
}

function keyframesOf(id: string): Keyframe[] {
  return getLayer(selectProject(store.getState()), id)?.keyframes ?? []
}

function addBox(id = 'a'): void {
  store.getState().addLayer(createLayer(id, 'rect', `Box ${id}`))
}

function fadeLayer(): Layer {
  return {
    ...createLayer('a', 'rect', 'Box'),
    keyframes: [
      { id: 'k0', progress: 0, values: { opacity: 0 }, ease: 'linear' },
      { id: 'k1', progress: 1, values: { opacity: 1 }, ease: 'linear' },
    ],
  }
}

beforeEach(() => {
  store.setState(createInitialData())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('addKeyframe', () => {
  it('stores all six values of the layer at the playhead: opacity 0 to 1 is 0.5 at 0.5', () => {
    store.getState().addLayer(fadeLayer())
    store.getState().setPlayhead(0.5)
    store.getState().addKeyframe('a')
    const added = keyframesOf('a').find((keyframe) => keyframe.progress === 0.5)
    expect(added?.values).toEqual({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotate: 0,
      opacity: 0.5,
      blur: 0,
    })
    expect(keyframesOf('a').map((keyframe) => keyframe.progress)).toEqual([0, 0.5, 1])
  })

  it('is one undo step, and adding twice at the same playhead gives one keyframe', () => {
    addBox()
    store.getState().addKeyframe('a')
    store.getState().addKeyframe('a')
    expect(keyframesOf('a')).toHaveLength(1)
    store.getState().undo()
    store.getState().undo()
    expect(keyframesOf('a')).toHaveLength(0)
  })

  it('does nothing for a layer that does not exist', () => {
    const before = store.getState()
    store.getState().addKeyframe('missing')
    expect(store.getState()).toBe(before)
  })
})

describe('nudgeLayer', () => {
  it('moves the layer by dx and dy percent: 30, 30 moved by 1, -1 is 31, 29', () => {
    addBox()
    store.getState().nudgeLayer('a', 1, -1)
    expect(baseOf('a')).toEqual({ x: 31, y: 29 })
  })

  it('removes floating point noise: 20 + 0.1 + 0.2 is 20.3', () => {
    store.getState().addLayer(createLayer('t', 'text', 'Title'))
    store.getState().nudgeLayer('t', 0.1, 0)
    store.getState().nudgeLayer('t', 0.2, 0)
    expect(baseOf('t').x).toBe(20.3)
  })

  it('does nothing for a zero move or an unknown layer', () => {
    addBox()
    const before = store.getState()
    store.getState().nudgeLayer('a', 0, 0)
    store.getState().nudgeLayer('missing', 1, 1)
    expect(store.getState()).toBe(before)
  })

  it('a burst of five nudges is one undo step', () => {
    addBox()
    const before = pastLength()
    for (let index = 0; index < 5; index++) store.getState().nudgeLayer('a', 1, 0)
    expect(baseOf('a').x).toBe(35)
    expect(pastLength()).toBe(before + 1)
    store.getState().undo()
    expect(baseOf('a').x).toBe(30)
  })

  it('fifty nudges, as a held arrow key makes, are still one undo step', () => {
    addBox()
    const before = pastLength()
    for (let index = 0; index < 50; index++) store.getState().nudgeLayer('a', 1, 0)
    expect(baseOf('a').x).toBe(80)
    expect(pastLength()).toBe(before + 1)
  })

  it('redo brings the whole burst back at once', () => {
    addBox()
    for (let index = 0; index < 5; index++) store.getState().nudgeLayer('a', 1, 0)
    store.getState().undo()
    store.getState().redo()
    expect(baseOf('a').x).toBe(35)
  })

  it('nudges that are more than a second apart are separate steps', () => {
    vi.useFakeTimers()
    addBox()
    const before = pastLength()
    store.getState().nudgeLayer('a', 1, 0)
    vi.advanceTimersByTime(MERGE_WINDOW_MS + 1)
    store.getState().nudgeLayer('a', 1, 0)
    expect(pastLength()).toBe(before + 2)
    store.getState().undo()
    expect(baseOf('a').x).toBe(31)
  })

  it('nudges exactly one second apart still join', () => {
    vi.useFakeTimers()
    addBox()
    const before = pastLength()
    store.getState().nudgeLayer('a', 1, 0)
    vi.advanceTimersByTime(MERGE_WINDOW_MS)
    store.getState().nudgeLayer('a', 1, 0)
    expect(pastLength()).toBe(before + 1)
  })

  it('the window slides: nudges 600 ms apart for 3 seconds are one step', () => {
    vi.useFakeTimers()
    addBox()
    const before = pastLength()
    for (let index = 0; index < 5; index++) {
      store.getState().nudgeLayer('a', 1, 0)
      vi.advanceTimersByTime(600)
    }
    expect(pastLength()).toBe(before + 1)
    expect(baseOf('a').x).toBe(35)
  })

  it('another kind of edit in between ends the burst', () => {
    addBox()
    const before = pastLength()
    store.getState().nudgeLayer('a', 1, 0)
    store.getState().updateLayer('a', { name: 'Renamed' })
    store.getState().nudgeLayer('a', 1, 0)
    expect(pastLength()).toBe(before + 3)
  })

  it('undo ends the burst: a nudge after an undo is a new step and clears redo', () => {
    addBox()
    store.getState().nudgeLayer('a', 1, 0)
    store.getState().undo()
    store.getState().nudgeLayer('a', 5, 0)
    expect(baseOf('a').x).toBe(35)
    store.getState().undo()
    expect(baseOf('a').x).toBe(30)
    expect(store.getState().history.future).toHaveLength(1)
  })

  it('nudging a different layer starts a new step', () => {
    addBox('a')
    addBox('b')
    const before = pastLength()
    store.getState().nudgeLayer('a', 1, 0)
    store.getState().nudgeLayer('b', 1, 0)
    expect(pastLength()).toBe(before + 2)
  })

  it('a project that was just loaded has no burst to join', () => {
    addBox()
    store.getState().nudgeLayer('a', 1, 0)
    store.getState().loadProject({
      ...createProject(),
      layers: [createLayer('a', 'rect', 'Box')],
    })
    store.getState().nudgeLayer('a', 1, 0)
    expect(pastLength()).toBe(1)
    expect(selectCanUndo(store.getState())).toBe(true)
  })
})

describe('shiftKeyframe', () => {
  function withKeyframes(progresses: number[]): void {
    store.getState().addLayer({
      ...createLayer('a', 'rect', 'Box'),
      keyframes: progresses.map((progress, index) => ({
        id: `k${String(index)}`,
        progress,
        values: { opacity: 1 },
        ease: 'linear',
      })),
    })
  }

  function progresses(): number[] {
    return keyframesOf('a').map((keyframe) => keyframe.progress)
  }

  it('moves a keyframe by delta: 0.5 moved by 0.01 is 0.51', () => {
    withKeyframes([0.5])
    store.getState().shiftKeyframe('a', 'k0', 0.01)
    expect(progresses()).toEqual([0.51])
  })

  it('removes floating point noise: 0.1 + 0.2 is 0.3', () => {
    withKeyframes([0.1])
    store.getState().shiftKeyframe('a', 'k0', 0.2)
    expect(progresses()).toEqual([0.3])
  })

  it('a burst of moves is one undo step', () => {
    withKeyframes([0.5])
    const before = pastLength()
    for (let index = 0; index < 10; index++) store.getState().shiftKeyframe('a', 'k0', 0.01)
    expect(progresses()).toEqual([0.6])
    expect(pastLength()).toBe(before + 1)
    store.getState().undo()
    expect(progresses()).toEqual([0.5])
  })

  it('stops at 0 and 1 without adding a step', () => {
    withKeyframes([0, 1])
    const before = store.getState()
    store.getState().shiftKeyframe('a', 'k0', -0.01)
    store.getState().shiftKeyframe('a', 'k1', 0.01)
    expect(store.getState()).toBe(before)
  })

  it('does not move a keyframe onto another one', () => {
    withKeyframes([0.5, 0.51])
    const before = store.getState()
    store.getState().shiftKeyframe('a', 'k0', 0.01)
    expect(store.getState()).toBe(before)
    expect(progresses()).toEqual([0.5, 0.51])
  })

  it('does nothing for unknown ids', () => {
    withKeyframes([0.5])
    const before = store.getState()
    store.getState().shiftKeyframe('a', 'missing', 0.1)
    store.getState().shiftKeyframe('missing', 'k0', 0.1)
    expect(store.getState()).toBe(before)
  })
})
