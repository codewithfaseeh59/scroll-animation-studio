import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SHORTCUTS } from '../../lib/shortcuts'
import { ShortcutsDialog } from './ShortcutsDialog'

describe('ShortcutsDialog', () => {
  it('is a dialog named Keyboard shortcuts', () => {
    render(<ShortcutsDialog onClose={() => undefined} />)
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })

  it('lists every shortcut with its keys and what it does', () => {
    render(<ShortcutsDialog onClose={() => undefined} />)
    for (const shortcut of SHORTCUTS) {
      expect(screen.getByText(shortcut.keys)).toBeInTheDocument()
      expect(screen.getByText(shortcut.description)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('term')).toHaveLength(SHORTCUTS.length)
    expect(screen.getAllByRole('definition')).toHaveLength(SHORTCUTS.length)
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<ShortcutsDialog onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
