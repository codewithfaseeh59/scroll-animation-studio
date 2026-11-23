import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { vi } from 'vitest'
import { createProject } from '../engine/document'
import { createInitialData, useEditorStore } from '../store/editorStore'
import { usePlayback } from './usePlayback'

type FrameCallback = (time: number) => void

let queued = new Map<number, FrameCallback>()
let nextId = 0

/** Runs the animation frames that are waiting, as if the browser painted at `time` ms. */
function runFrame(time: number): void {
  const callbacks = [...queued.values()]
  queued = new Map()
  act(() => {
    callbacks.forEach((callback) => {
      callback(time)
    })
  })
}

function playhead(): number {
  return useEditorStore.getState().playhead
}

beforeEach(() => {
  queued = new Map()
  nextId = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    nextId += 1
    queued.set(nextId, callback)
    return nextId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    queued.delete(id)
  })
  // 4 viewport heights: the whole scene plays in 6 seconds.
  useEditorStore.setState(createInitialData({ ...createProject(), sceneLength: 4 }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePlayback', () => {
  it('does nothing while paused', () => {
    renderHook(() => {
      usePlayback()
    })
    expect(queued.size).toBe(0)
  })

  it('advances the playhead with time: 1.5s of 6s is 0.25, 3s is 0.5', () => {
    renderHook(() => {
      usePlayback()
    })
    act(() => {
      useEditorStore.getState().play()
    })
    runFrame(0)
    expect(playhead()).toBe(0)
    runFrame(1500)
    expect(playhead()).toBe(0.25)
    runFrame(3000)
    expect(playhead()).toBe(0.5)
    expect(useEditorStore.getState().isPlaying).toBe(true)
  })

  it('stops at the end of the scene and pauses', () => {
    renderHook(() => {
      usePlayback()
    })
    act(() => {
      useEditorStore.getState().play()
    })
    runFrame(0)
    runFrame(6000)
    expect(playhead()).toBe(1)
    expect(useEditorStore.getState().isPlaying).toBe(false)
    expect(queued.size).toBe(0)
  })

  it('stops asking for frames when paused', () => {
    renderHook(() => {
      usePlayback()
    })
    act(() => {
      useEditorStore.getState().play()
    })
    runFrame(0)
    act(() => {
      useEditorStore.getState().pause()
    })
    expect(queued.size).toBe(0)
  })

  it('continues from a new position when the playhead is moved during playback', () => {
    renderHook(() => {
      usePlayback()
    })
    act(() => {
      useEditorStore.getState().play()
    })
    runFrame(0)
    act(() => {
      useEditorStore.getState().setPlayhead(0.5)
    })
    runFrame(1500)
    expect(playhead()).toBe(0.75)
  })

  it('takes longer for a longer scene: 8 viewport heights need 12 seconds, so 3s is 0.25', () => {
    useEditorStore.setState(createInitialData({ ...createProject(), sceneLength: 8 }))
    renderHook(() => {
      usePlayback()
    })
    act(() => {
      useEditorStore.getState().play()
    })
    runFrame(0)
    runFrame(3000)
    expect(playhead()).toBe(0.25)
  })
})
