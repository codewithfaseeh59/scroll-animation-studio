import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
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
})
