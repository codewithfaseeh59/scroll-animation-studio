import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLayer, createProject, getLayer } from '../../engine/document'
import type { Layer } from '../../engine/types'
import { createInitialData, selectProject, useEditorStore } from '../../store/editorStore'
import { AppShell } from './AppShell'

function load(layers: Layer[], selectedLayerId: string | null = null): void {
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers }),
    selectedLayerId,
  })
}

function layerIds(): string[] {
  return selectProject(useEditorStore.getState()).layers.map((layer) => layer.id)
}

function keyframeCount(id: string): number {
  return getLayer(selectProject(useEditorStore.getState()), id)?.keyframes.length ?? 0
}

const box = (): Layer => createLayer('a', 'rect', 'Box')

describe('shortcuts in the editor', () => {
  it('K adds a keyframe for the layer chosen in the layer list, and the timeline shows it', async () => {
    load([box()])
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Box Rectangle' }))
    await userEvent.keyboard('k')
    expect(keyframeCount('a')).toBe(1)
    expect(screen.getByRole('button', { name: 'Box: keyframe at 0%' })).toBeInTheDocument()
  })

  it('arrow keys move the selected layer, and the inspector shows the new position', async () => {
    load([box()], 'a')
    render(<AppShell />)
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}')
    expect(screen.getByLabelText('X (%)')).toHaveValue(31)
    expect(screen.getByLabelText('Y (%)')).toHaveValue(40)
  })

  it('Ctrl+Z undoes what was done in the interface', async () => {
    load([])
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    expect(layerIds()).toHaveLength(1)
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(layerIds()).toHaveLength(0)
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(layerIds()).toHaveLength(1)
  })

  it('Delete removes the selected layer', async () => {
    load([box()], 'a')
    render(<AppShell />)
    await userEvent.keyboard('{Delete}')
    expect(layerIds()).toEqual([])
  })

  it('Space plays and pauses the preview', async () => {
    load([])
    render(<AppShell />)
    await userEvent.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Pause preview' })).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Play preview' })).toBeInTheDocument()
  })

  it('Space on the focused Play button presses the button once, not twice', async () => {
    load([])
    render(<AppShell />)
    screen.getByRole('button', { name: 'Play preview' }).focus()
    await userEvent.keyboard(' ')
    expect(useEditorStore.getState().isPlaying).toBe(true)
  })

  it('Space does not scroll the page', () => {
    load([])
    render(<AppShell />)
    expect(fireEvent.keyDown(document.body, { key: ' ' })).toBe(false)
  })
})

describe('shortcuts stay quiet', () => {
  it('while typing in an inspector field', async () => {
    load([box()], 'a')
    render(<AppShell />)
    const name = screen.getByLabelText('Name')
    await userEvent.click(name)
    await userEvent.keyboard('k {Backspace}{Delete}{ArrowLeft}{ArrowRight}')
    expect(layerIds()).toEqual(['a'])
    expect(keyframeCount('a')).toBe(0)
    expect(screen.getByLabelText('X (%)')).toHaveValue(30)
    expect(useEditorStore.getState().isPlaying).toBe(false)
  })

  it('while typing a number: Delete and arrows edit the number, not the layer', async () => {
    load([box()], 'a')
    render(<AppShell />)
    const x = screen.getByLabelText('X (%)')
    await userEvent.clear(x)
    await userEvent.type(x, '45{ArrowUp}{Delete}')
    expect(layerIds()).toEqual(['a'])
  })

  it('while the export dialog is open', async () => {
    load([box()], 'a')
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    await userEvent.keyboard('k{ArrowRight} ')
    expect(keyframeCount('a')).toBe(0)
    expect(useEditorStore.getState().isPlaying).toBe(false)
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Delete}')
    expect(layerIds()).toEqual([])
  })

  it('while the shortcuts dialog is open', async () => {
    load([box()], 'a')
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Shortcuts' }))
    await userEvent.keyboard('{Delete}')
    expect(layerIds()).toEqual(['a'])
  })

  it('when a keyframe on the timeline handles the key itself: Delete removes only the keyframe', async () => {
    const layer: Layer = {
      ...box(),
      keyframes: [
        { id: 'k0', progress: 0.25, values: { opacity: 1 }, ease: 'linear' },
        { id: 'k1', progress: 0.75, values: { opacity: 0 }, ease: 'linear' },
      ],
    }
    load([layer], 'a')
    render(<AppShell />)
    screen.getByRole('button', { name: 'Box: keyframe at 25%' }).focus()
    await userEvent.keyboard('{Delete}')
    expect(layerIds()).toEqual(['a'])
    expect(keyframeCount('a')).toBe(1)
  })

  it('when the playhead slider uses the arrow keys: the layer stays where it is', async () => {
    load([box()], 'a')
    render(<AppShell />)
    screen.getByRole('slider', { name: 'Playhead' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByLabelText('X (%)')).toHaveValue(30)
    expect(useEditorStore.getState().playhead).toBe(0.01)
  })
})
