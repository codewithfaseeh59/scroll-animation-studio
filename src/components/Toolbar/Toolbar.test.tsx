import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  it('shows the app title and offers the opposite theme', () => {
    render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
    expect(screen.getByRole('heading', { level: 1, name: 'ScrollStudio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
  })

  it('offers light theme while dark is active', () => {
    render(<Toolbar theme="dark" onToggleTheme={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })

  it('calls onToggleTheme when the button is clicked', async () => {
    const onToggleTheme = vi.fn()
    render(<Toolbar theme="light" onToggleTheme={onToggleTheme} />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('offers to play the preview, and to pause it while it plays', async () => {
    useEditorStore.setState(createInitialData())
    render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: 'Play preview' }))
    expect(useEditorStore.getState().isPlaying).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Pause preview' }))
    expect(useEditorStore.getState().isPlaying).toBe(false)
    expect(screen.getByRole('button', { name: 'Play preview' })).toBeInTheDocument()
  })

  it('toggles the browser preview and shows whether it is on', async () => {
    useEditorStore.setState(createInitialData())
    render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
    const button = screen.getByRole('button', { name: 'Browser preview' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(useEditorStore.getState().previewMode).toBe('browser')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(button)
    expect(useEditorStore.getState().previewMode).toBe('editor')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('opens the export dialog, and Escape closes it and returns focus to Export', async () => {
    useEditorStore.setState(createInitialData())
    render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByRole('dialog', { name: 'Export' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toHaveFocus()
  })
})
