import { act, fireEvent, render } from '@testing-library/react'
import { vi } from 'vitest'
import { createProject, getLayer } from '../../engine/document'
import type { Layer } from '../../engine/types'
import {
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from '../../store/editorStore'
import { Stage } from './Stage'

function makeLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: 'a',
    name: 'Layer a',
    type: 'rect',
    base: { x: 10, y: 20, width: 30, height: 40 },
    style: { color: '#ff0000', text: '', fontSize: 16, src: '', radius: 0 },
    keyframes: [],
    ...overrides,
  }
}

/**
 * The frame is 1000 x 500 px at the page origin. The selected layer (x 10%,
 * y 20%, 30% x 40%) is 300 x 200 px, so its centre is at (250, 200).
 */
function renderSelected(layer: Layer = makeLayer()) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.hasAttribute('data-selection-box')) {
      return { left: 100, top: 100, width: 300, height: 200 } as DOMRect
    }
    return { left: 0, top: 0, width: 1000, height: 500 } as DOMRect
  })
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers: [layer] }),
    selectedLayerId: 'a',
  })
  const view = render(<Stage />)
  return view
}

function handle(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-handle="${name}"]`)
  if (!element) throw new Error(`handle ${name} missing`)
  return element
}

function baseOfA(): { x: number; y: number; width: number; height: number } {
  const base = getLayer(selectProject(useEditorStore.getState()), 'a')?.base
  if (!base) throw new Error('layer a missing')
  return base
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('selection overlay', () => {
  it('shows eight resize handles and a rotate handle for the selected layer only', () => {
    const { container } = renderSelected()
    expect(container.querySelectorAll('[data-handle]')).toHaveLength(9)
    expect(container.querySelector('[data-selection-box]')).toBeInTheDocument()
  })

  it('shows nothing when no layer is selected', () => {
    const { container } = renderSelected()
    act(() => {
      useEditorStore.getState().select(null)
    })
    expect(container.querySelectorAll('[data-handle]')).toHaveLength(0)
  })

  it('pressing a handle does not clear the selection', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'e'), { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerUp(window)
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
  })
})

describe('resizing with a handle', () => {
  it('east handle: dragging +100px (1000px stage) makes the layer 40% wide', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'e'), { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 500, clientY: 200 })
    fireEvent.pointerUp(window)
    expect(baseOfA()).toEqual({ x: 10, y: 20, width: 40, height: 40 })
  })

  it('north-west handle: dragging (-100, -50) grows it to 40% x 50% and moves it to 0% / 10%', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'nw'), { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 0, clientY: 50 })
    fireEvent.pointerUp(window)
    expect(baseOfA()).toEqual({ x: 0, y: 10, width: 40, height: 50 })
  })

  it('shows the new size while dragging, before anything is stored', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'e'), { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 500, clientY: 200 })
    const layer = container.querySelector<HTMLElement>('[data-layer-id="a"]')
    expect(layer?.style.width).toBe('40%')
    expect(baseOfA().width).toBe(30)
    fireEvent.pointerUp(window)
  })

  it('a whole resize is one undo step', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'e'), { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 450, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 500, clientY: 200 })
    fireEvent.pointerUp(window)
    useEditorStore.getState().undo()
    expect(baseOfA().width).toBe(30)
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('pressing a handle without moving changes nothing', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'e'), { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerUp(window)
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })
})

describe('rotating with the rotate handle', () => {
  it('turning from right of the centre to below it writes a rotate keyframe of 90 at the playhead', () => {
    const { container } = renderSelected()
    useEditorStore.getState().setPlayhead(0.5)
    fireEvent.pointerDown(handle(container, 'rotate'), { button: 0, clientX: 350, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 250, clientY: 300 })
    fireEvent.pointerUp(window)
    const keyframes = getLayer(selectProject(useEditorStore.getState()), 'a')?.keyframes ?? []
    expect(keyframes).toHaveLength(1)
    expect(keyframes[0]?.progress).toBe(0.5)
    expect(keyframes[0]?.values).toEqual({ rotate: 90 })
    expect(keyframes[0]?.ease).toBe('linear')
  })

  it('starts from the current rotation: 30 plus a 90 degree turn is 120', () => {
    const layer = makeLayer({
      keyframes: [{ id: 'k1', progress: 0.5, values: { rotate: 30 }, ease: 'linear' }],
    })
    const { container } = renderSelected(layer)
    useEditorStore.getState().setPlayhead(0.5)
    fireEvent.pointerDown(handle(container, 'rotate'), { button: 0, clientX: 350, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 250, clientY: 300 })
    fireEvent.pointerUp(window)
    const keyframes = getLayer(selectProject(useEditorStore.getState()), 'a')?.keyframes ?? []
    expect(keyframes).toHaveLength(1)
    expect(keyframes[0]?.values.rotate).toBe(120)
  })

  it('shows the rotation while dragging, before anything is stored', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'rotate'), { button: 0, clientX: 350, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 250, clientY: 300 })
    const layer = container.querySelector<HTMLElement>('[data-layer-id="a"]')
    expect(layer?.style.getPropertyValue('rotate')).toBe('90deg')
    expect(baseOfA()).toEqual({ x: 10, y: 20, width: 30, height: 40 })
    fireEvent.pointerUp(window)
  })

  it('a whole rotation is one undo step', () => {
    const { container } = renderSelected()
    fireEvent.pointerDown(handle(container, 'rotate'), { button: 0, clientX: 350, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 300, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 250, clientY: 300 })
    fireEvent.pointerUp(window)
    useEditorStore.getState().undo()
    expect(getLayer(selectProject(useEditorStore.getState()), 'a')?.keyframes).toEqual([])
  })
})
