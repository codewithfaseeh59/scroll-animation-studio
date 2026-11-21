import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders the four labelled editor regions', () => {
    render(<AppShell />)
    expect(screen.getByRole('complementary', { name: 'Layers' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeInTheDocument()
  })

  it('switches the document theme from the toolbar', async () => {
    render(<AppShell />)
    expect(document.documentElement.dataset.theme).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
