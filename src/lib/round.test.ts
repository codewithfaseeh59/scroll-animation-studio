import { roundTo } from './round'

describe('roundTo', () => {
  it('rounds to the given number of decimals', () => {
    expect(roundTo(1.2345, 2)).toBe(1.23)
    expect(roundTo(1.2355, 3)).toBe(1.236)
  })

  it('removes floating point noise: 0.1 + 0.2 becomes 0.3', () => {
    expect(roundTo(0.1 + 0.2, 3)).toBe(0.3)
  })

  it('rounds to a whole number with 0 decimals', () => {
    expect(roundTo(2.5, 0)).toBe(3)
    expect(roundTo(-2.4, 0)).toBe(-2)
  })
})
