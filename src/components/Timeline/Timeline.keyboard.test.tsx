import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLayer, createProject } from '../../engine/document'
import type { Layer } from '../../engine/types'
import {
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from '../../store/editorStore'
import { Timeline } from './Timeline'

function boxWith(progresses: number[]): Layer {
  return {
    ...createLayer('a', 'rect', 'Box'),
    keyframes: progresses.map((progress, index) => ({
      id: `k${String(index)}`,
      progress,
      values: { opacity: 1 },
      ease: 'linear',
    })),
  }
}

function load(layers: Layer[], selectedLayerId: string | null = null): void {
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers }),
    selectedLayerId,
  })
}

function progresses(): number[] {
  const layer = selectProject(useEditorStore.getState()).layers[0]
  return (layer?.keyframes ?? []).map((keyframe) => keyframe.progress)
}

function diamond(percent: number): HTMLElement {
  return screen.getByRole('button', { name: `Box: keyframe at ${String(percent)}%` })
}

describe('Timeline keyboard use', () => {
  it('reaches the layer name, the playhead and then each keyframe with Tab', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Box' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('slider', { name: 'Playhead' })).toHaveFocus()
    await userEvent.tab()
    expect(diamond(25)).toHaveFocus()
    await userEvent.tab()
    expect(diamond(75)).toHaveFocus()
  })

  it('selecting a layer name with the keyboard selects the layer', async () => {
    load([boxWith([0.25])])
    render(<Timeline />)
    screen.getByRole('button', { name: 'Box' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
  })

  it('focusing a keyframe selects it and its layer, without moving the playhead', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    await userEvent.tab({ shift: true })
    diamond(75).focus()
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
    expect(useEditorStore.getState().selectedKeyframeId).toBe('k1')
    expect(useEditorStore.getState().playhead).toBe(0)
    expect(diamond(75)).toHaveAttribute('aria-pressed', 'true')
    expect(diamond(25)).toHaveAttribute('aria-pressed', 'false')
  })

  it('Enter on a keyframe puts the playhead on it', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    diamond(75).focus()
    await userEvent.keyboard('{Enter}')
    expect(useEditorStore.getState().playhead).toBe(0.75)
  })

  it('Space on a keyframe puts the playhead on it too', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    diamond(25).focus()
    await userEvent.keyboard(' ')
    expect(useEditorStore.getState().playhead).toBe(0.25)
  })

  it('a click with the mouse does not jump the playhead, since a drag may follow', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    await userEvent.click(diamond(75))
    expect(useEditorStore.getState().selectedKeyframeId).toBe('k1')
  })

  it('ArrowRight moves the keyframe 1% later and ArrowLeft 1% earlier', async () => {
    load([boxWith([0.5])])
    render(<Timeline />)
    diamond(50).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(progresses()).toEqual([0.51])
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(progresses()).toEqual([0.49])
  })

  it('Shift+Arrow moves it 10%', async () => {
    load([boxWith([0.5])])
    render(<Timeline />)
    diamond(50).focus()
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(progresses()).toEqual([0.6])
  })

  it('a run of arrow presses is one undo step', async () => {
    load([boxWith([0.5])])
    render(<Timeline />)
    diamond(50).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(progresses()).toEqual([0.55])
    act(() => {
      useEditorStore.getState().undo()
    })
    expect(progresses()).toEqual([0.5])
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('stops at the end of the scene', async () => {
    load([boxWith([1])])
    render(<Timeline />)
    diamond(100).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(progresses()).toEqual([1])
  })

  it('does not move a keyframe onto another', async () => {
    load([boxWith([0.5, 0.51])])
    render(<Timeline />)
    diamond(50).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(progresses()).toEqual([0.5, 0.51])
  })

  it('keeps the arrow keys away from the layer shortcuts', async () => {
    load([boxWith([0.5])], 'a')
    render(<Timeline />)
    diamond(50).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(selectProject(useEditorStore.getState()).layers[0]?.base.x).toBe(30)
  })

  it('Delete removes the keyframe and moves focus to the next one', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    diamond(25).focus()
    await userEvent.keyboard('{Delete}')
    expect(progresses()).toEqual([0.75])
    expect(diamond(75)).toHaveFocus()
  })

  it('Delete on the last keyframe of a row moves focus to the one before', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    diamond(75).focus()
    await userEvent.keyboard('{Backspace}')
    expect(progresses()).toEqual([0.25])
    expect(diamond(25)).toHaveFocus()
  })

  it('Delete on the only keyframe moves focus to the layer name', async () => {
    load([boxWith([0.5])])
    render(<Timeline />)
    diamond(50).focus()
    await userEvent.keyboard('{Delete}')
    expect(progresses()).toEqual([])
    expect(screen.getByRole('button', { name: 'Box' })).toHaveFocus()
  })

  it('Delete is one undo step', async () => {
    load([boxWith([0.25, 0.75])])
    render(<Timeline />)
    diamond(25).focus()
    await userEvent.keyboard('{Delete}')
    act(() => {
      useEditorStore.getState().undo()
    })
    expect(progresses()).toEqual([0.25, 0.75])
  })

  it('tells selected from not selected with text, not only colour', () => {
    load([boxWith([0.25, 0.75])], 'a')
    useEditorStore.getState().selectKeyframe('a', 'k0')
    render(<Timeline />)
    expect(diamond(25)).toHaveAttribute('aria-pressed', 'true')
    expect(diamond(75)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Box' })).toHaveAttribute('aria-pressed', 'true')
  })
})
