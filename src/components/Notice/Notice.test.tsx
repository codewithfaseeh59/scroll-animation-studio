import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { Notice } from './Notice'

beforeEach(() => {
  useEditorStore.setState(createInitialData())
})

describe('Notice', () => {
  it('shows nothing while there is no message', () => {
    render(<Notice />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows the message with a Dismiss button', () => {
    render(<Notice />)
    act(() => {
      useEditorStore.getState().setNotice('Imported project.json.')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Imported project.json.')
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('goes away when dismissed', async () => {
    render(<Notice />)
    act(() => {
      useEditorStore.getState().setNotice('Imported project.json.')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(useEditorStore.getState().notice).toBeNull()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('follows a new message', () => {
    render(<Notice />)
    act(() => {
      useEditorStore.getState().setNotice('First')
    })
    act(() => {
      useEditorStore.getState().setNotice('Second')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Second')
    expect(screen.getByRole('status')).not.toHaveTextContent('First')
  })
})
