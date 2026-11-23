import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SelectField } from './SelectField'

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
] as const

describe('SelectField', () => {
  it('shows its label, the options and the current choice', () => {
    render(<SelectField label="Letter" value="b" options={OPTIONS} onChange={() => undefined} />)
    const select = screen.getByLabelText('Letter')
    expect(select).toHaveValue('b')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Alpha',
      'Beta',
    ])
  })

  it('reports the chosen value', async () => {
    const onChange = vi.fn()
    render(<SelectField label="Letter" value="a" options={OPTIONS} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Letter'), 'Beta')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
