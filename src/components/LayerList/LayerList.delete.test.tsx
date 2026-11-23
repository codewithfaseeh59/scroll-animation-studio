import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLayer, createProject, getLayer } from '../../engine/document'
import type { Layer, Project } from '../../engine/types'
import {
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from '../../store/editorStore'
import { LayerList } from './LayerList'

function current(): Project {
  return selectProject(useEditorStore.getState())
}

function ids(): string[] {
  return current().layers.map((layer) => layer.id)
}

function load(layers: Layer[], selectedLayerId: string | null = null): void {
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers }),
    selectedLayerId,
  })
}

const three = (): Layer[] => [
  createLayer('a', 'rect', 'Alpha'),
  createLayer('b', 'rect', 'Beta'),
  createLayer('c', 'rect', 'Gamma'),
]

function selectButton(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) })
}

describe('LayerList delete', () => {
  it('has a Delete button named after its layer in every row', () => {
    load(three())
    render(<LayerList />)
    for (const name of ['Alpha', 'Beta', 'Gamma']) {
      expect(screen.getByRole('button', { name: `Delete ${name}` })).toBeInTheDocument()
    }
  })

  it('removes the layer', async () => {
    load(three())
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }))
    expect(ids()).toEqual(['a', 'c'])
    expect(screen.queryByRole('button', { name: 'Delete Beta' })).not.toBeInTheDocument()
  })

  it('takes the keyframes of the layer with it', async () => {
    const layer: Layer = {
      ...createLayer('a', 'rect', 'Alpha'),
      keyframes: [{ id: 'k0', progress: 0, values: { opacity: 0 }, ease: 'linear' }],
    }
    load([layer])
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    expect(JSON.stringify(current())).not.toContain('k0')
  })

  it('is one undo step, and Undo brings the layer back in its place', async () => {
    load(three())
    render(<LayerList />)
    const before = current()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }))
    expect(selectCanUndo(useEditorStore.getState())).toBe(true)
    useEditorStore.getState().undo()
    expect(current()).toBe(before)
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('clears the selection when the selected layer is deleted', async () => {
    load(three(), 'b')
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }))
    expect(useEditorStore.getState().selectedLayerId).toBeNull()
  })

  it('keeps the selection when another layer is deleted', async () => {
    load(three(), 'a')
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }))
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
  })

  it('does not select the layer it deletes first', async () => {
    load(three(), 'a')
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Gamma' }))
    expect(useEditorStore.getState().selectedLayerId).toBe('a')
  })

  it('is reached with the keyboard: Tab goes from a layer to its Delete button, Enter deletes', async () => {
    load(three())
    render(<LayerList />)
    selectButton('Gamma').focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Delete Gamma' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(ids()).toEqual(['a', 'b'])
  })

  it('Space on a Delete button deletes too', async () => {
    load(three())
    render(<LayerList />)
    screen.getByRole('button', { name: 'Delete Alpha' }).focus()
    await userEvent.keyboard(' ')
    expect(ids()).toEqual(['b', 'c'])
  })

  it('moves focus to the layer below after deleting from the middle (the list shows the top layer first)', async () => {
    load(three())
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }))
    expect(selectButton('Alpha')).toHaveFocus()
  })

  it('moves focus to the layer above after deleting the last row', async () => {
    load(three())
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    expect(selectButton('Beta')).toHaveFocus()
  })

  it('moves focus to the next layer after deleting the first row', async () => {
    load(three())
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Gamma' }))
    expect(selectButton('Beta')).toHaveFocus()
  })

  it('moves focus to Add rectangle after deleting the only layer', async () => {
    load([createLayer('a', 'rect', 'Alpha')])
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    expect(screen.getByRole('button', { name: 'Add rectangle' })).toHaveFocus()
    expect(screen.getByText('No layers yet. Add one above.')).toBeInTheDocument()
  })

  it('names the layer exactly, whatever it is called', () => {
    load([createLayer('a', 'text', 'Hello "world" <b>')])
    render(<LayerList />)
    expect(getLayer(current(), 'a')?.name).toBe('Hello "world" <b>')
    expect(screen.getByRole('button', { name: 'Delete Hello "world" <b>' })).toBeInTheDocument()
  })
})
