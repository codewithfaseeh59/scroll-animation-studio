import { easeCurvePoints } from './easeCurve'

describe('easeCurvePoints', () => {
  it('linear in a 100 x 50 box with 4 segments is a straight line', () => {
    expect(easeCurvePoints('linear', 100, 50, 4)).toBe('0,50 25,37.5 50,25 75,12.5 100,0')
  })

  it('power2In bends below the line: at t 0.5 the value is 0.25, so y = 50 - 12.5 = 37.5', () => {
    expect(easeCurvePoints('power2In', 100, 50, 2)).toBe('0,50 50,37.5 100,0')
  })

  it('power2Out bends above the line: at t 0.5 the value is 0.75, so y = 12.5', () => {
    expect(easeCurvePoints('power2Out', 100, 50, 2)).toBe('0,50 50,12.5 100,0')
  })

  it('has one more point than segments and always starts at the bottom left and ends at the top right', () => {
    for (const name of ['easeIn', 'easeOut', 'easeInOut', 'power2InOut', 'sineInOut'] as const) {
      const points = easeCurvePoints(name, 100, 50, 10).split(' ')
      expect(points).toHaveLength(11)
      expect(points[0]).toBe('0,50')
      expect(points[10]).toBe('100,0')
    }
  })
})
