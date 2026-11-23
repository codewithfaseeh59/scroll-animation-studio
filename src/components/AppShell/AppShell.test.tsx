import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders the four labelled editor regions', () => {
    render(<AppShell />)
    expect(screen.getByRole('complementary', { name: 'Layers' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeInTheDocument()
  })

  it('shows the editable stage by default and the browser preview when switched on', async () => {
    useEditorStore.setState(createInitialData())
    const { container } = render(<AppShell />)
    expect(container.querySelector('[data-stage-frame]')).toBeInTheDocument()
    expect(screen.queryByTitle('Browser preview of the exported CSS')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Browser preview' }))
    expect(screen.getByTitle('Browser preview of the exported CSS')).toBeInTheDocument()
    expect(container.querySelector('[data-stage-frame]')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Browser preview' }))
    expect(container.querySelector('[data-stage-frame]')).toBeInTheDocument()
    expect(screen.queryByTitle('Browser preview of the exported CSS')).not.toBeInTheDocument()
  })

  it('switches the document theme from the toolbar', async () => {
    render(<AppShell />)
    expect(document.documentElement.dataset.theme).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
