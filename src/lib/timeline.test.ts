import { formatPercent, progressFromPointer } from './timeline'

describe('progressFromPointer', () => {
  it('maps a pointer inside the track: x 150 on a track from 100 that is 200 wide is 0.25', () => {
    expect(progressFromPointer(150, 100, 200)).toBe(0.25)
  })

  it('is 0 at the left edge and 1 at the right edge', () => {
    expect(progressFromPointer(100, 100, 200)).toBe(0)
    expect(progressFromPointer(300, 100, 200)).toBe(1)
  })

  it('stops at 0 and 1 outside the track', () => {
    expect(progressFromPointer(0, 100, 200)).toBe(0)
    expect(progressFromPointer(900, 100, 200)).toBe(1)
  })

  it('returns 0 for a track without width', () => {
    expect(progressFromPointer(150, 100, 0)).toBe(0)
  })
})

describe('formatPercent', () => {
  it.each([
    [0, '0%'],
    [0.5, '50%'],
    [1, '100%'],
    [0.125, '12.5%'],
    [1 / 3, '33.3%'],
  ])('%d becomes %s', (progress, expected) => {
    expect(formatPercent(progress)).toBe(expected)
  })
})
