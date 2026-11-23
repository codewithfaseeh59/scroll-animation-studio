import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { createLayer, createProject } from '../../engine/document'
import type { Layer } from '../../engine/types'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { Timeline } from './Timeline'

function load(layers: Layer[], selectedLayerId: string | null = null): void {
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers }),
    selectedLayerId,
  })
}

function withKeyframes(layer: Layer, progresses: number[]): Layer {
  return {
    ...layer,
    keyframes: progresses.map((progress, index) => ({
      id: `${layer.id}-k${String(index)}`,
      progress,
      values: { opacity: 1 },
      ease: 'linear',
    })),
  }
}

/** The track area starts at x 100 and is 400px wide: x 300 is progress 0.5. */
function mockTrackRect(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    width: 400,
  } as DOMRect)
}

function playhead(): number {
  return useEditorStore.getState().playhead
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Timeline layout', () => {
  it('shows a ruler from 0% to 100% with a tick every 10%', () => {
    load([])
    const { container } = render(<Timeline />)
    const ticks = [...container.querySelectorAll('[data-tick]')]
    expect(ticks).toHaveLength(11)
    expect(ticks[0]).toHaveTextContent('0%')
    expect(ticks[5]).toHaveTextContent('50%')
    expect(ticks[10]).toHaveTextContent('100%')
  })

  it('invites you to add a layer when the project has none', () => {
    load([])
    render(<Timeline />)
    expect(screen.getByText('Add a layer to start animating.')).toBeInTheDocument()
  })

  it('has one row per layer, the top-most (last) layer first', () => {
    load([createLayer('a', 'rect', 'Box'), createLayer('b', 'text', 'Title')])
    const { container } = render(<Timeline />)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Title',
      'Box',
    ])
    expect(container.querySelectorAll('[data-keyframe-id]')).toHaveLength(0)
    expect(screen.queryByText('Add a layer to start animating.')).not.toBeInTheDocument()
  })

  it('draws a diamond for each keyframe at its progress in percent', () => {
    load([withKeyframes(createLayer('a', 'rect', 'Box'), [0.25, 0.75])])
    const { container } = render(<Timeline />)
    const diamonds = [...container.querySelectorAll<HTMLElement>('[data-keyframe-id]')]
    expect(diamonds.map((diamond) => diamond.style.left)).toEqual(['25%', '75%'])
    expect(screen.getByRole('img', { name: 'Keyframe at 25%' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Keyframe at 75%' })).toBeInTheDocument()
  })
})

describe('Timeline selection', () => {
  it('clicking a layer name selects it', async () => {
    load([createLayer('a', 'rect', 'Box'), createLayer('b', 'text', 'Title')])
    render(<Timeline />)
    await userEvent.click(screen.getByRole('button', { name: 'Box' }))
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
    expect(screen.getByRole('button', { name: 'Box' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Title' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('pressing a layer row selects that layer', () => {
    load([createLayer('a', 'rect', 'Box')])
    mockTrackRect()
    const { container } = render(<Timeline />)
    const row = container.querySelector<HTMLElement>('[data-layer-row="a"]')
    if (!row) throw new Error('row missing')
    fireEvent.pointerDown(row, { button: 0, clientX: 300 })
    fireEvent.pointerUp(window)
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
    expect(playhead()).toBe(0.5)
  })
})

describe('Timeline scrubbing', () => {
  it('pressing the track jumps the playhead: x 300 on a track from 100, 400 wide, is 0.5', () => {
    load([])
    mockTrackRect()
    const { container } = render(<Timeline />)
    const ruler = container.querySelector<HTMLElement>('[role="slider"]')
    if (!ruler) throw new Error('ruler missing')
    fireEvent.pointerDown(ruler, { button: 0, clientX: 300 })
    fireEvent.pointerUp(window)
    expect(playhead()).toBe(0.5)
  })

  it('follows the pointer while dragging, stops at both ends, and ignores moves after release', () => {
    load([])
    mockTrackRect()
    const { container } = render(<Timeline />)
    const ruler = container.querySelector<HTMLElement>('[role="slider"]')
    if (!ruler) throw new Error('ruler missing')
    fireEvent.pointerDown(ruler, { button: 0, clientX: 200 })
    expect(playhead()).toBe(0.25)
    fireEvent.pointerMove(window, { clientX: 400 })
    expect(playhead()).toBe(0.75)
    fireEvent.pointerMove(window, { clientX: 900 })
    expect(playhead()).toBe(1)
    fireEvent.pointerMove(window, { clientX: 0 })
    expect(playhead()).toBe(0)
    fireEvent.pointerUp(window)
    fireEvent.pointerMove(window, { clientX: 300 })
    expect(playhead()).toBe(0)
  })

  it('ignores the right mouse button', () => {
    load([])
    mockTrackRect()
    const { container } = render(<Timeline />)
    const ruler = container.querySelector<HTMLElement>('[role="slider"]')
    if (!ruler) throw new Error('ruler missing')
    fireEvent.pointerDown(ruler, { button: 2, clientX: 300 })
    expect(playhead()).toBe(0)
  })

  it('moves the playhead line and the readout with the playhead', () => {
    load([])
    const { container } = render(<Timeline />)
    expect(screen.getByText('Playhead 0%')).toBeInTheDocument()
    act(() => {
      useEditorStore.getState().setPlayhead(0.5)
    })
    expect(screen.getByText('Playhead 50%')).toBeInTheDocument()
    const line = container.querySelector<HTMLElement>('[data-playhead]')
    expect(line?.style.left).toBe('50%')
  })
})

describe('Timeline playhead slider', () => {
  it('exposes the playhead as a slider from 0 to 100', () => {
    load([])
    render(<Timeline />)
    const slider = screen.getByRole('slider', { name: 'Playhead' })
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    act(() => {
      useEditorStore.getState().setPlayhead(0.125)
    })
    expect(slider).toHaveAttribute('aria-valuenow', '12.5')
    expect(slider).toHaveAttribute('aria-valuetext', '12.5%')
  })

  it('arrow keys move by 1%, Shift+arrow by 10%, Home and End jump to the ends', async () => {
    load([])
    render(<Timeline />)
    const slider = screen.getByRole('slider', { name: 'Playhead' })
    slider.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(playhead()).toBe(0.01)
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(playhead()).toBeCloseTo(0.11, 10)
    await userEvent.keyboard('{ArrowLeft}')
    expect(playhead()).toBeCloseTo(0.1, 10)
    await userEvent.keyboard('{End}')
    expect(playhead()).toBe(1)
    await userEvent.keyboard('{ArrowRight}')
    expect(playhead()).toBe(1)
    await userEvent.keyboard('{Home}')
    expect(playhead()).toBe(0)
  })
})
