import { vi } from 'vitest'
import { copyText } from './clipboard'

function setClipboard(value: unknown): void {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

afterEach(() => {
  setClipboard(undefined)
})

describe('copyText', () => {
  it('writes the text to the clipboard and returns true', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    setClipboard({ writeText })
    expect(await copyText('hello')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('returns false when the browser refuses', async () => {
    setClipboard({ writeText: () => Promise.reject(new Error('denied')) })
    expect(await copyText('hello')).toBe(false)
  })

  it('returns false when there is no clipboard', async () => {
    setClipboard(undefined)
    expect(await copyText('hello')).toBe(false)
  })
})
