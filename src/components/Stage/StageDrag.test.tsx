import { fireEvent, render } from '@testing-library/react'
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

function makeLayer(id: string): Layer {
  return {
    id,
    name: `Layer ${id}`,
    type: 'rect',
    base: { x: 10, y: 20, width: 30, height: 40 },
    style: { color: '#ff0000', text: '', fontSize: 16, src: '', radius: 0 },
    keyframes: [],
  }
}

/** The frame is 1000px wide and 500px tall, so 10px across is 1% and 5px down is 1%. */
function renderStage() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 1000,
    height: 500,
  } as DOMRect)
  useEditorStore.setState(createInitialData({ ...createProject(), layers: [makeLayer('a')] }))
  const view = render(<Stage />)
  const layer = view.container.querySelector<HTMLElement>('[data-layer-id="a"]')
  const frame = view.container.querySelector<HTMLElement>('[data-stage-frame]')
  if (!layer || !frame) throw new Error('stage not rendered')
  return { ...view, layer, frame }
}

function baseOfA(): { x: number; y: number } {
  const base = getLayer(selectProject(useEditorStore.getState()), 'a')?.base
  if (!base) throw new Error('layer a missing')
  return { x: base.x, y: base.y }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('selecting on the stage', () => {
  it('pressing a layer selects it, and a plain click is not an undo step', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerUp(window)
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
    expect(layer).toHaveAttribute('data-selected')
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('pressing the empty stage clears the selection', () => {
    const { layer, frame } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerUp(window)
    fireEvent.pointerDown(frame, { button: 0 })
    expect(useEditorStore.getState().selectedLayerId).toBeNull()
  })

  it('ignores other mouse buttons', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 2, clientX: 500, clientY: 250 })
    expect(useEditorStore.getState().selectedLayerId).toBeNull()
  })
})

describe('dragging a layer', () => {
  it('moves the base by the pointer distance in percent: 50px is 5%, 25px is 5%', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 550, clientY: 275 })
    fireEvent.pointerUp(window)
    expect(baseOfA()).toEqual({ x: 15, y: 25 })
  })

  it('shows the new position while dragging, before anything is stored', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 550, clientY: 275 })
    expect(layer.style.left).toBe('15%')
    expect(baseOfA()).toEqual({ x: 10, y: 20 })
    fireEvent.pointerUp(window)
  })

  it('snaps: moving 95px gives x 19.5, whose right edge 49.5 snaps to the centre line, so x is 20', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 595, clientY: 250 })
    fireEvent.pointerUp(window)
    expect(baseOfA()).toEqual({ x: 20, y: 20 })
  })

  it('draws a guide while snapped and removes it on release', () => {
    const { layer, container } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 595, clientY: 250 })
    expect(container.querySelectorAll('[data-guide="x"]')).toHaveLength(1)
    fireEvent.pointerUp(window)
    expect(container.querySelectorAll('[data-guide]')).toHaveLength(0)
  })

  it('a whole drag with many moves is one undo step', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 520, clientY: 255 })
    fireEvent.pointerMove(window, { clientX: 540, clientY: 265 })
    fireEvent.pointerMove(window, { clientX: 550, clientY: 275 })
    fireEvent.pointerUp(window)
    expect(baseOfA()).toEqual({ x: 15, y: 25 })
    useEditorStore.getState().undo()
    expect(baseOfA()).toEqual({ x: 10, y: 20 })
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('stops following the pointer after release', () => {
    const { layer } = renderStage()
    fireEvent.pointerDown(layer, { button: 0, clientX: 500, clientY: 250 })
    fireEvent.pointerMove(window, { clientX: 550, clientY: 275 })
    fireEvent.pointerUp(window)
    fireEvent.pointerMove(window, { clientX: 900, clientY: 400 })
    expect(baseOfA()).toEqual({ x: 15, y: 25 })
  })
})
