import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLayer, createProject, getLayer } from '../../engine/document'
import type { Layer } from '../../engine/types'
import {
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from '../../store/editorStore'
import { Inspector } from './Inspector'

function load(layers: Layer[], selectedLayerId: string | null): void {
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers }),
    selectedLayerId,
  })
}

function layerA(): Layer {
  const layer = getLayer(selectProject(useEditorStore.getState()), 'a')
  if (!layer) throw new Error('layer a missing')
  return layer
}

async function editField(label: string, text: string): Promise<void> {
  const input = screen.getByLabelText(label)
  await userEvent.clear(input)
  await userEvent.type(input, text)
  await userEvent.tab()
}

describe('Inspector', () => {
  it('asks to select a layer when nothing is selected', () => {
    load([createLayer('a', 'rect', 'Box')], null)
    render(<Inspector />)
    expect(screen.getByText('Select a layer to edit its properties.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('shows the selected rectangle: name, base values and style fields', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Inspector />)
    expect(screen.getByLabelText('Name')).toHaveValue('Box')
    expect(screen.getByLabelText('X (%)')).toHaveValue(30)
    expect(screen.getByLabelText('Y (%)')).toHaveValue(30)
    expect(screen.getByLabelText('Width (%)')).toHaveValue(40)
    expect(screen.getByLabelText('Height (%)')).toHaveValue(40)
    expect(screen.getByLabelText('Color')).toHaveValue('#4f46e5')
    expect(screen.getByLabelText('Corner radius')).toHaveValue(0)
    expect(screen.queryByLabelText('Text')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Image URL')).not.toBeInTheDocument()
  })

  it('shows text, font size and colour for a text layer, but no radius', () => {
    load([createLayer('a', 'text', 'Title')], 'a')
    render(<Inspector />)
    expect(screen.getByLabelText('Text')).toHaveValue('Text')
    expect(screen.getByLabelText('Font size')).toHaveValue(48)
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
    expect(screen.queryByLabelText('Corner radius')).not.toBeInTheDocument()
  })

  it('shows the image URL and radius for an image layer, but no colour', () => {
    load([createLayer('a', 'image', 'Photo')], 'a')
    render(<Inspector />)
    expect(screen.getByLabelText('Image URL')).toHaveValue('')
    expect(screen.getByLabelText('Corner radius')).toBeInTheDocument()
    expect(screen.queryByLabelText('Color')).not.toBeInTheDocument()
  })

  it('editing the width stores it and is one undo step', async () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Inspector />)
    await editField('Width (%)', '55')
    expect(layerA().base).toEqual({ x: 30, y: 30, width: 55, height: 40 })
    useEditorStore.getState().undo()
    expect(layerA().base.width).toBe(40)
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('width cannot go below the 1% minimum', async () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Inspector />)
    await editField('Width (%)', '0')
    expect(layerA().base.width).toBe(1)
  })

  it('renames the layer', async () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Inspector />)
    await editField('Name', 'Hero')
    expect(layerA().name).toBe('Hero')
  })

  it('changes text and font size of a text layer', async () => {
    load([createLayer('a', 'text', 'Title')], 'a')
    render(<Inspector />)
    await editField('Text', 'Hello')
    await editField('Font size', '60')
    expect(layerA().style.text).toBe('Hello')
    expect(layerA().style.fontSize).toBe(60)
  })

  it('accepts a hex colour and rejects text that is not one', async () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Inspector />)
    await editField('Color', '#00ff00')
    expect(layerA().style.color).toBe('#00ff00')
    await editField('Color', 'green')
    expect(layerA().style.color).toBe('#00ff00')
    expect(screen.getByLabelText('Color')).toHaveValue('#00ff00')
  })

  it('sets the image URL and corner radius of an image layer', async () => {
    load([createLayer('a', 'image', 'Photo')], 'a')
    render(<Inspector />)
    await editField('Image URL', '/photo.png')
    await editField('Corner radius', '12')
    expect(layerA().style.src).toBe('/photo.png')
    expect(layerA().style.radius).toBe(12)
  })

  it('shows the new values after an undo', async () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Inspector />)
    await editField('Width (%)', '55')
    expect(screen.getByLabelText('Width (%)')).toHaveValue(55)
    act(() => {
      useEditorStore.getState().undo()
    })
    expect(screen.getByLabelText('Width (%)')).toHaveValue(40)
  })

  it('shows another layer when the selection changes', () => {
    load([createLayer('a', 'rect', 'Box'), createLayer('b', 'text', 'Title')], 'a')
    render(<Inspector />)
    expect(screen.getByLabelText('Name')).toHaveValue('Box')
    act(() => {
      useEditorStore.getState().select('b')
    })
    expect(screen.getByLabelText('Name')).toHaveValue('Title')
    expect(screen.getByLabelText('Font size')).toBeInTheDocument()
  })
})
