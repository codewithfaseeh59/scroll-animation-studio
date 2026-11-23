import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLayer, createProject, getLayer } from '../../engine/document'
import type { Keyframe, Layer } from '../../engine/types'
import {
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from '../../store/editorStore'
import { Inspector } from './Inspector'

function fade(): Keyframe[] {
  return [
    { id: 'k0', progress: 0, values: { opacity: 0 }, ease: 'linear' },
    { id: 'k1', progress: 1, values: { opacity: 1 }, ease: 'linear' },
  ]
}

function load(keyframes: Keyframe[] = []): void {
  const layer: Layer = { ...createLayer('a', 'rect', 'Box'), keyframes }
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers: [layer] }),
    selectedLayerId: 'a',
  })
}

function keyframes(): Keyframe[] {
  return getLayer(selectProject(useEditorStore.getState()), 'a')?.keyframes ?? []
}

async function editField(label: string, text: string): Promise<void> {
  const input = screen.getByLabelText(label)
  await userEvent.clear(input)
  await userEvent.type(input, text)
  await userEvent.tab()
}

describe('Inspector animation section', () => {
  it('shows the values at the playhead: opacity 0 to 1 is 0.5 at 0.5', () => {
    load(fade())
    useEditorStore.getState().setPlayhead(0.5)
    render(<Inspector />)
    expect(screen.getByText('Animation at 50%')).toBeInTheDocument()
    expect(screen.getByLabelText('Opacity')).toHaveValue(0.5)
    expect(screen.getByLabelText('Scale')).toHaveValue(1)
    expect(screen.getByLabelText('Move X (%)')).toHaveValue(0)
  })

  it('follows the playhead', () => {
    load(fade())
    render(<Inspector />)
    expect(screen.getByLabelText('Opacity')).toHaveValue(0)
    act(() => {
      useEditorStore.getState().setPlayhead(0.25)
    })
    expect(screen.getByLabelText('Opacity')).toHaveValue(0.25)
  })

  it('auto-key: editing opacity at 0.5 adds a keyframe there, between the existing two', async () => {
    load(fade())
    useEditorStore.getState().setPlayhead(0.5)
    render(<Inspector />)
    await editField('Opacity', '0.8')
    expect(keyframes().map((keyframe) => keyframe.progress)).toEqual([0, 0.5, 1])
    expect(keyframes()[1]?.values).toEqual({ opacity: 0.8 })
  })

  it('auto-key: editing again at the same playhead updates that keyframe', async () => {
    load(fade())
    useEditorStore.getState().setPlayhead(0.5)
    render(<Inspector />)
    await editField('Opacity', '0.8')
    await editField('Scale', '2')
    expect(keyframes()).toHaveLength(3)
    expect(keyframes()[1]?.values).toEqual({ opacity: 0.8, scale: 2 })
  })

  it('creates the first keyframe of a layer without keyframes', async () => {
    load()
    useEditorStore.getState().setPlayhead(0.3)
    render(<Inspector />)
    await editField('Move X (%)', '25')
    expect(keyframes()).toHaveLength(1)
    expect(keyframes()[0]?.progress).toBe(0.3)
    expect(keyframes()[0]?.values).toEqual({ translateX: 25 })
  })

  it('does not create a keyframe when the value is left as it was', async () => {
    load(fade())
    useEditorStore.getState().setPlayhead(0.5)
    render(<Inspector />)
    await editField('Opacity', '0.5')
    expect(keyframes()).toHaveLength(2)
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('keeps opacity within 0 and 1 and blur at 0 or more', async () => {
    load()
    render(<Inspector />)
    await editField('Opacity', '0.5')
    await editField('Opacity', '5')
    await editField('Blur (px)', '5')
    await editField('Blur (px)', '-3')
    expect(keyframes()[0]?.values).toEqual({ opacity: 1, blur: 0 })
  })

  it('Add keyframe stores all six current values at the playhead', async () => {
    load(fade())
    useEditorStore.getState().setPlayhead(0.5)
    render(<Inspector />)
    await userEvent.click(screen.getByRole('button', { name: 'Add keyframe' }))
    expect(keyframes()).toHaveLength(3)
    expect(keyframes()[1]?.progress).toBe(0.5)
    expect(keyframes()[1]?.values).toEqual({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotate: 0,
      opacity: 0.5,
      blur: 0,
    })
  })

  it('Add keyframe twice at the same playhead still gives one keyframe', async () => {
    load()
    render(<Inspector />)
    await userEvent.click(screen.getByRole('button', { name: 'Add keyframe' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add keyframe' }))
    expect(keyframes()).toHaveLength(1)
  })

  it('Delete keyframe is disabled until a keyframe is selected, then removes it', async () => {
    load(fade())
    render(<Inspector />)
    const button = screen.getByRole('button', { name: 'Delete keyframe' })
    expect(button).toBeDisabled()
    act(() => {
      useEditorStore.getState().selectKeyframe('a', 'k1')
    })
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(keyframes().map((keyframe) => keyframe.id)).toEqual(['k0'])
    expect(button).toBeDisabled()
  })
})
