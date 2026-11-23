import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SHORTCUTS } from '../../lib/shortcuts'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { Toolbar } from './Toolbar'

beforeEach(() => {
  useEditorStore.setState(createInitialData())
})

describe('Toolbar shortcuts', () => {
  it('opens a list of the keyboard shortcuts', async () => {
    render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: 'Shortcuts' }))
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
    for (const shortcut of SHORTCUTS) {
      expect(screen.getByText(shortcut.description)).toBeInTheDocument()
    }
  })

  it('Escape closes it and returns focus to the Shortcuts button', async () => {
    render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: 'Shortcuts' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shortcuts' })).toHaveFocus()
  })
})
