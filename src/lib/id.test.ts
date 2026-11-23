import { createId } from './id'

describe('createId', () => {
  it('returns a non-empty string', () => {
    expect(createId()).not.toBe('')
  })

  it('returns a different id every time', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()))
    expect(ids.size).toBe(100)
  })
})
