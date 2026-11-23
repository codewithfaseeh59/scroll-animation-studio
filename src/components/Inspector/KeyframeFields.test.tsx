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

function twoKeyframes(): Keyframe[] {
  return [
    { id: 'k0', progress: 0, values: { opacity: 0 }, ease: 'linear' },
    { id: 'k1', progress: 0.5, values: { opacity: 1 }, ease: 'power2Out' },
  ]
}

function load(): void {
  const layer: Layer = { ...createLayer('a', 'rect', 'Box'), keyframes: twoKeyframes() }
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers: [layer] }),
    selectedLayerId: 'a',
  })
}

function selectKeyframe(id: string): void {
  act(() => {
    useEditorStore.getState().selectKeyframe('a', id)
  })
}

function easeOf(id: string): string | undefined {
  return getLayer(selectProject(useEditorStore.getState()), 'a')?.keyframes.find(
    (keyframe) => keyframe.id === id,
  )?.ease
}

describe('Inspector keyframe section', () => {
  it('is hidden while no keyframe is selected', () => {
    load()
    render(<Inspector />)
    expect(screen.queryByLabelText('Easing')).not.toBeInTheDocument()
  })

  it('shows the selected keyframe progress and its current easing', () => {
    load()
    render(<Inspector />)
    selectKeyframe('k1')
    expect(screen.getByText('Keyframe at 50%')).toBeInTheDocument()
    expect(screen.getByLabelText('Easing')).toHaveValue('power2Out')
  })

  it('lists all eight easings', () => {
    load()
    render(<Inspector />)
    selectKeyframe('k1')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Linear',
      'Ease in',
      'Ease out',
      'Ease in-out',
      'Power2 in',
      'Power2 out',
      'Power2 in-out',
      'Sine in-out',
    ])
  })

  it('changing the easing updates the keyframe and is one undo step', async () => {
    load()
    render(<Inspector />)
    selectKeyframe('k1')
    await userEvent.selectOptions(screen.getByLabelText('Easing'), 'Sine in-out')
    expect(easeOf('k1')).toBe('sineInOut')
    expect(easeOf('k0')).toBe('linear')
    act(() => {
      useEditorStore.getState().undo()
    })
    expect(easeOf('k1')).toBe('power2Out')
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('draws the curve of the chosen easing', async () => {
    load()
    const { container } = render(<Inspector />)
    selectKeyframe('k1')
    const before = container.querySelector('polyline')?.getAttribute('points')
    await userEvent.selectOptions(screen.getByLabelText('Easing'), 'Linear')
    const after = container.querySelector('polyline')?.getAttribute('points')
    expect(before).not.toBe(after)
    expect(after?.startsWith('0,50 2.5,48.75 ')).toBe(true)
    expect(after?.endsWith(' 100,0')).toBe(true)
  })

  it('explains that the first keyframe has no easing effect, and only there', () => {
    load()
    render(<Inspector />)
    selectKeyframe('k0')
    expect(screen.getByText(/has no effect here/)).toBeInTheDocument()
    selectKeyframe('k1')
    expect(screen.queryByText(/has no effect here/)).not.toBeInTheDocument()
  })

  it('goes away when the keyframe is deselected', () => {
    load()
    render(<Inspector />)
    selectKeyframe('k1')
    act(() => {
      useEditorStore.getState().select('a')
    })
    expect(screen.queryByLabelText('Easing')).not.toBeInTheDocument()
  })
})
