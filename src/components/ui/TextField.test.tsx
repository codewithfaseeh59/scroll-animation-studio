import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { TextField } from './TextField'

function setup(isValid?: (value: string) => boolean) {
  const onCommit = vi.fn()
  const view = render(<TextField label="Name" value="Box" onCommit={onCommit} isValid={isValid} />)
  const input = screen.getByLabelText('Name')
  return { ...view, input, onCommit }
}

describe('TextField', () => {
  it('shows its label and value', () => {
    const { input } = setup()
    expect(input).toHaveValue('Box')
  })

  it('does not commit while typing, only on blur', async () => {
    const { input, onCommit } = setup()
    await userEvent.clear(input)
    await userEvent.type(input, 'Hero')
    expect(onCommit).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledWith('Hero')
  })

  it('commits on Enter only once', async () => {
    const { input, onCommit } = setup()
    await userEvent.clear(input)
    await userEvent.type(input, 'Hero{Enter}')
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('does not commit an unchanged value', async () => {
    const { input, onCommit } = setup()
    await userEvent.click(input)
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('drops invalid text and shows the old value', async () => {
    const { input, onCommit } = setup((value) => value.startsWith('#'))
    await userEvent.clear(input)
    await userEvent.type(input, 'nope')
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
    expect(input).toHaveValue('Box')
  })

  it('Escape cancels the edit', async () => {
    const { input, onCommit } = setup()
    await userEvent.type(input, 'xyz{Escape}')
    expect(input).toHaveValue('Box')
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })
})
