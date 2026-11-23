import { vi } from 'vitest'
import { supportsScrollDrivenAnimations } from './browserSupport'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('supportsScrollDrivenAnimations', () => {
  it('is true when the browser says it supports animation-timeline: view()', () => {
    const supports = vi.fn(() => true)
    vi.stubGlobal('CSS', { supports })
    expect(supportsScrollDrivenAnimations()).toBe(true)
    expect(supports).toHaveBeenCalledWith('animation-timeline', 'view()')
  })

  it('is false when the browser says it does not', () => {
    vi.stubGlobal('CSS', { supports: () => false })
    expect(supportsScrollDrivenAnimations()).toBe(false)
  })

  it('is false when there is no CSS object', () => {
    vi.stubGlobal('CSS', undefined)
    expect(supportsScrollDrivenAnimations()).toBe(false)
  })

  it('is false when CSS.supports is missing', () => {
    vi.stubGlobal('CSS', {})
    expect(supportsScrollDrivenAnimations()).toBe(false)
  })
})
