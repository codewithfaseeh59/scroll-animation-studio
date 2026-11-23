import { act, render, screen } from '@testing-library/react'
import { createProject } from '../../engine/document'
import type { Layer, LayerType, Project } from '../../engine/types'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { Stage } from './Stage'

function makeLayer(id: string, type: LayerType, overrides: Partial<Layer> = {}): Layer {
  return {
    id,
    name: `Layer ${id}`,
    type,
    base: { x: 10, y: 20, width: 30, height: 40 },
    style: { color: '#ff0000', text: 'Hello', fontSize: 32, src: '', radius: 0 },
    keyframes: [],
    ...overrides,
  }
}

function load(project: Project): void {
  useEditorStore.setState(createInitialData(project))
}

function layerElement(container: HTMLElement, id: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-layer-id="${id}"]`)
  if (!element) throw new Error(`layer ${id} not rendered`)
  return element
}

describe('Stage', () => {
  it('renders an empty frame for a project without layers', () => {
    load(createProject())
    const { container } = render(<Stage />)
    expect(container.querySelector('[data-stage-frame]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-layer-id]')).toHaveLength(0)
  })

  it('sets the frame ratio from the project aspect ratio (2:1 gives 2)', () => {
    load({ ...createProject(), aspectRatio: { width: 2, height: 1 } })
    const { container } = render(<Stage />)
    const frame = container.querySelector<HTMLElement>('[data-stage-frame]')
    expect(frame?.style.getPropertyValue('--ratio')).toBe('2')
  })

  it('renders text, image and rect layers in layer order', () => {
    load({
      ...createProject(),
      layers: [
        makeLayer('a', 'text'),
        makeLayer('b', 'image', {
          name: 'Photo',
          style: { color: '#000000', text: '', fontSize: 16, src: '/photo.png', radius: 0 },
        }),
        makeLayer('c', 'rect'),
      ],
    })
    const { container } = render(<Stage />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Photo' })).toHaveAttribute('src', '/photo.png')
    const order = [...container.querySelectorAll('[data-layer-id]')].map((element) =>
      element.getAttribute('data-layer-id'),
    )
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('renders a placeholder instead of an image while the source is empty', () => {
    load({ ...createProject(), layers: [makeLayer('a', 'image')] })
    const { container } = render(<Stage />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('[data-image-placeholder]')).toBeInTheDocument()
  })

  it('positions a layer from its base in percent', () => {
    load({ ...createProject(), layers: [makeLayer('a', 'rect')] })
    const { container } = render(<Stage />)
    const style = layerElement(container, 'a').style
    expect([style.left, style.top, style.width, style.height]).toEqual(['10%', '20%', '30%', '40%'])
  })

  it('follows the playhead: opacity 0 to 1 over the scene is 0.5 at progress 0.5', () => {
    load({
      ...createProject(),
      layers: [
        makeLayer('a', 'rect', {
          keyframes: [
            { id: 'k1', progress: 0, values: { opacity: 0 }, ease: 'linear' },
            { id: 'k2', progress: 1, values: { opacity: 1 }, ease: 'linear' },
          ],
        }),
      ],
    })
    const { container } = render(<Stage />)
    expect(layerElement(container, 'a').style.opacity).toBe('0')
    act(() => {
      useEditorStore.getState().setPlayhead(0.5)
    })
    expect(layerElement(container, 'a').style.opacity).toBe('0.5')
  })
})
