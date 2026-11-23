import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Modal } from './Modal'

function renderModal(onClose: () => void = () => undefined, autofocus = false) {
  return render(
    <Modal title="Settings" onClose={onClose}>
      <button type="button">First</button>
      <button type="button" data-autofocus={autofocus ? '' : undefined}>
        Second
      </button>
      <button type="button">Last</button>
    </Modal>,
  )
}

describe('Modal', () => {
  it('is a modal dialog named by its title', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument()
  })

  it('shows its content', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument()
  })

  it('sets the width from the width prop', () => {
    render(
      <Modal title="Wide" onClose={() => undefined} width={900}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog').style.getPropertyValue('--modal-width')).toBe('900px')
  })

  it('starts with focus on the first control, which is the Close button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('starts with focus on the element marked data-autofocus', () => {
    renderModal(() => undefined, true)
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with the Close button', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is pressed, but not when the dialog is', () => {
    const onClose = vi.fn()
    renderModal(onClose)
    const dialog = screen.getByRole('dialog')
    fireEvent.mouseDown(dialog)
    expect(onClose).not.toHaveBeenCalled()
    if (!dialog.parentElement) throw new Error('backdrop missing')
    fireEvent.mouseDown(dialog.parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab inside: from the last control to the first, and back with Shift+Tab', async () => {
    renderModal()
    screen.getByRole('button', { name: 'Last' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('moves through the controls in order with Tab', async () => {
    renderModal()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()
  })

  it('gives focus back to the element that had it before it opened', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = renderModal()
    expect(opener).not.toHaveFocus()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
