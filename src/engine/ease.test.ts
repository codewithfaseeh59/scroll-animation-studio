import { cubicBezier, ease, easeToCss } from './ease'
import { EASE_NAMES } from './types'

describe('ease', () => {
  it.each(EASE_NAMES)('%s returns 0 at 0 and 1 at 1', (name) => {
    expect(ease(name, 0)).toBe(0)
    expect(ease(name, 1)).toBe(1)
  })

  it.each(EASE_NAMES)('%s never decreases', (name) => {
    let previous = 0
    for (let i = 1; i <= 100; i++) {
      const value = ease(name, i / 100)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  it('linear(0.5) = 0.5', () => {
    expect(ease('linear', 0.5)).toBe(0.5)
  })

  it('power2In(0.5) = 0.25', () => {
    expect(ease('power2In', 0.5)).toBe(0.25)
  })

  it('power2Out(0.5) = 0.75', () => {
    expect(ease('power2Out', 0.5)).toBe(0.75)
  })

  it('power2InOut is 0.125 at 0.25, 0.5 at 0.5 and 0.875 at 0.75', () => {
    expect(ease('power2InOut', 0.25)).toBe(0.125)
    expect(ease('power2InOut', 0.5)).toBe(0.5)
    expect(ease('power2InOut', 0.75)).toBe(0.875)
  })

  it('sineInOut is 0.5 at 0.5 and (1 - cos(pi/4)) / 2 = 0.1464466 at 0.25', () => {
    expect(ease('sineInOut', 0.5)).toBeCloseTo(0.5, 10)
    expect(ease('sineInOut', 0.25)).toBeCloseTo(0.1464466, 6)
  })

  it('easeInOut is symmetric: 0.5 at 0.5', () => {
    expect(ease('easeInOut', 0.5)).toBeCloseTo(0.5, 6)
  })

  it('easeIn follows the curve point at s = 0.5: x = 0.6575, y = 0.5', () => {
    expect(ease('easeIn', 0.6575)).toBeCloseTo(0.5, 5)
  })

  it('easeOut follows the curve point at s = 0.5: x = 0.3425, y = 0.5', () => {
    expect(ease('easeOut', 0.3425)).toBeCloseTo(0.5, 5)
  })

  it('clamps input outside 0..1', () => {
    expect(ease('power2In', -1)).toBe(0)
    expect(ease('power2In', 2)).toBe(1)
  })
})

describe('cubicBezier', () => {
  it('a straight-line curve (0.25, 0.25, 0.75, 0.75) is linear: f(0.3) = 0.3', () => {
    expect(cubicBezier(0.25, 0.25, 0.75, 0.75)(0.3)).toBeCloseTo(0.3, 6)
  })

  it('solves a steep curve: f(0.5) = 0.5 by symmetry', () => {
    const steep = cubicBezier(0.9, 0, 0.1, 1)
    expect(steep(0.5)).toBeCloseTo(0.5, 6)
    expect(steep(0.25)).toBeLessThan(0.25)
    expect(steep(0.75)).toBeGreaterThan(0.75)
  })
})

describe('easeToCss', () => {
  it('uses CSS keywords where they exist', () => {
    expect(easeToCss('linear')).toBe('linear')
    expect(easeToCss('easeIn')).toBe('ease-in')
    expect(easeToCss('easeOut')).toBe('ease-out')
    expect(easeToCss('easeInOut')).toBe('ease-in-out')
  })

  it('uses cubic-bezier approximations for power2 and sine', () => {
    expect(easeToCss('power2In')).toBe('cubic-bezier(0.11, 0, 0.5, 0)')
    expect(easeToCss('power2Out')).toBe('cubic-bezier(0.5, 1, 0.89, 1)')
    expect(easeToCss('power2InOut')).toBe('cubic-bezier(0.45, 0, 0.55, 1)')
    expect(easeToCss('sineInOut')).toBe('cubic-bezier(0.37, 0, 0.63, 1)')
  })

  it.each(['power2In', 'power2Out', 'power2InOut', 'sineInOut'] as const)(
    'the %s cubic-bezier stays within 0.01 of the exact function',
    (name) => {
      const match = /^cubic-bezier\(([^)]+)\)$/.exec(easeToCss(name))
      const numbers = (match?.[1] ?? '').split(',').map(Number)
      const [x1, y1, x2, y2] = numbers
      if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
        throw new Error('expected four cubic-bezier numbers')
      }
      const approximation = cubicBezier(x1, y1, x2, y2)
      for (let i = 0; i <= 100; i++) {
        const t = i / 100
        expect(Math.abs(approximation(t) - ease(name, t))).toBeLessThan(0.01)
      }
    },
  )
})
