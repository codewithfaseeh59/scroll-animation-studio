import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLayer, createProject } from '../../engine/document'
import { createInitialData, selectProject, useEditorStore } from '../../store/editorStore'
import { Toolbar } from './Toolbar'

function renderToolbar(): void {
  render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
}

beforeEach(() => {
  useEditorStore.setState(createInitialData())
})

describe('Toolbar new project', () => {
  it('opens the New project dialog', async () => {
    renderToolbar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'New project' }))
    expect(screen.getByRole('dialog', { name: 'New project' })).toBeInTheDocument()
  })

  it('Escape closes it and returns focus to the New project button', async () => {
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'New project' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New project' })).toHaveFocus()
  })

  it('starts a template, closes the dialog and keeps the toolbar usable', async () => {
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'New project' }))
    await userEvent.click(screen.getByRole('button', { name: /Slide-in cards/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(selectProject(useEditorStore.getState()).name).toBe('Slide-in cards')
    expect(screen.getByRole('button', { name: 'New project' })).toHaveFocus()
  })

  it('asks before replacing a project that has layers', async () => {
    useEditorStore.setState(
      createInitialData({ ...createProject(), layers: [createLayer('a', 'rect', 'Box')] }),
    )
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'New project' }))
    await userEvent.click(screen.getByRole('button', { name: /Slide-in cards/ }))
    expect(screen.getByText('Replace the current project?')).toBeInTheDocument()
    expect(selectProject(useEditorStore.getState()).layers).toHaveLength(1)
  })
})
