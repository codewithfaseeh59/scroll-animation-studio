import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { NumberField } from './NumberField'

function setup(value = 30, min?: number) {
  const onCommit = vi.fn()
  const view = render(<NumberField label="Width" value={value} onCommit={onCommit} min={min} />)
  const input = screen.getByLabelText('Width')
  return { ...view, input, onCommit }
}

describe('NumberField', () => {
  it('shows its label and value', () => {
    const { input } = setup(30)
    expect(input).toHaveValue(30)
  })

  it('does not commit while typing, only on blur', async () => {
    const { input, onCommit } = setup()
    await userEvent.clear(input)
    await userEvent.type(input, '45')
    expect(onCommit).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(45)
  })

  it('commits on Enter, and the following blur does not commit again', async () => {
    const { input, onCommit } = setup()
    await userEvent.clear(input)
    await userEvent.type(input, '12.5{Enter}')
    expect(onCommit).toHaveBeenCalledWith(12.5)
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('does not commit when the number did not change', async () => {
    const { input, onCommit } = setup(30)
    await userEvent.clear(input)
    await userEvent.type(input, '30')
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('drops an empty input and shows the old value again', async () => {
    const { input, onCommit } = setup(30)
    await userEvent.clear(input)
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
    expect(input).toHaveValue(30)
  })

  it('raises a value below the minimum: min 1 and input 0 commits 1', async () => {
    const { input, onCommit } = setup(30, 1)
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledWith(1)
  })

  it('Escape cancels the edit', async () => {
    const { input, onCommit } = setup(30)
    await userEvent.clear(input)
    await userEvent.type(input, '99{Escape}')
    expect(input).toHaveValue(30)
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('shows a new value from outside when it is not being edited', () => {
    const { input, rerender, onCommit } = setup(30)
    rerender(<NumberField label="Width" value={55} onCommit={onCommit} />)
    expect(input).toHaveValue(55)
  })
})

describe('NumberField maximum', () => {
  it('lowers a value above the maximum: max 1 and input 5 commits 1', async () => {
    const onCommit = vi.fn()
    render(<NumberField label="Opacity" value={0.5} onCommit={onCommit} min={0} max={1} />)
    const input = screen.getByLabelText('Opacity')
    await userEvent.clear(input)
    await userEvent.type(input, '5')
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledWith(1)
  })
})
