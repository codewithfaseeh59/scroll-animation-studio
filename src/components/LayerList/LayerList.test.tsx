import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInitialData, selectProject, useEditorStore } from '../../store/editorStore'
import { LayerList } from './LayerList'

beforeEach(() => {
  useEditorStore.setState(createInitialData())
})

function listedNames(): string[] {
  return screen
    .queryAllByRole('listitem')
    .map((item) => within(item).getAllByText(/./)[0]?.textContent ?? '')
}

describe('LayerList', () => {
  it('shows an empty message and the three add buttons', () => {
    render(<LayerList />)
    expect(screen.getByText('No layers yet. Add one above.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add rectangle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add text' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add image' })).toBeInTheDocument()
  })

  it('adds a rectangle named "Rectangle 1" and selects it', async () => {
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    const layers = selectProject(useEditorStore.getState()).layers
    expect(layers).toHaveLength(1)
    expect(layers[0]?.type).toBe('rect')
    expect(layers[0]?.name).toBe('Rectangle 1')
    expect(screen.getByRole('button', { name: /^Rectangle 1/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText('No layers yet. Add one above.')).not.toBeInTheDocument()
  })

  it('adds text and image layers of the right type', async () => {
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Add text' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add image' }))
    const types = selectProject(useEditorStore.getState()).layers.map((layer) => layer.type)
    expect(types).toEqual(['text', 'image'])
  })

  it('numbers names per type: a second rectangle is "Rectangle 2"', async () => {
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add text' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    const names = selectProject(useEditorStore.getState()).layers.map((layer) => layer.name)
    expect(names).toEqual(['Rectangle 1', 'Text 1', 'Rectangle 2'])
  })

  it('lists the top-most (last) layer first', async () => {
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add text' }))
    expect(listedNames()).toEqual(['Text 1', 'Rectangle 1'])
  })

  it('clicking a layer selects it', async () => {
    render(<LayerList />)
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add text' }))
    await userEvent.click(screen.getByRole('button', { name: /^Rectangle 1/ }))
    expect(screen.getByRole('button', { name: /^Rectangle 1/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /^Text 1/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
