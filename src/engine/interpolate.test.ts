import { DEFAULT_VALUES, interpolateLayer, interpolateProperty } from './interpolate'
import type { EaseName, Keyframe, KeyframeValues, Layer } from './types'

function kf(
  id: string,
  progress: number,
  values: KeyframeValues,
  ease: EaseName = 'linear',
): Keyframe {
  return { id, progress, values, ease }
}

function layerWith(keyframes: Keyframe[]): Layer {
  return {
    id: 'l1',
    name: 'Layer',
    type: 'rect',
    base: { x: 0, y: 0, width: 10, height: 10 },
    style: { color: '#000000', text: '', fontSize: 16, src: '', radius: 0 },
    keyframes,
  }
}

describe('interpolateProperty', () => {
  it('returns undefined when no keyframe defines the property', () => {
    expect(interpolateProperty([], 'opacity', 0.5)).toBeUndefined()
    expect(interpolateProperty([kf('a', 0, { scale: 2 })], 'opacity', 0.5)).toBeUndefined()
  })

  it('holds the first value before the first keyframe', () => {
    const keyframes = [kf('a', 0.2, { opacity: 0.3 }), kf('b', 0.8, { opacity: 0.9 })]
    expect(interpolateProperty(keyframes, 'opacity', 0)).toBe(0.3)
    expect(interpolateProperty(keyframes, 'opacity', 0.2)).toBe(0.3)
  })

  it('holds the last value after the last keyframe', () => {
    const keyframes = [kf('a', 0.2, { opacity: 0.3 }), kf('b', 0.8, { opacity: 0.9 })]
    expect(interpolateProperty(keyframes, 'opacity', 0.8)).toBe(0.9)
    expect(interpolateProperty(keyframes, 'opacity', 1)).toBe(0.9)
  })

  it('a single keyframe holds its value everywhere', () => {
    const keyframes = [kf('a', 0.5, { rotate: 45 })]
    expect(interpolateProperty(keyframes, 'rotate', 0)).toBe(45)
    expect(interpolateProperty(keyframes, 'rotate', 1)).toBe(45)
  })

  it('the midpoint between opacity 0 and 1 with linear is 0.5', () => {
    const keyframes = [kf('a', 0, { opacity: 0 }), kf('b', 1, { opacity: 1 })]
    expect(interpolateProperty(keyframes, 'opacity', 0.5)).toBe(0.5)
  })

  it('maps progress into the local range: 0.2 to 0.6 at 0.4 is halfway, so 50', () => {
    const keyframes = [kf('a', 0.2, { translateX: 0 }), kf('b', 0.6, { translateX: 100 })]
    expect(interpolateProperty(keyframes, 'translateX', 0.4)).toBeCloseTo(50, 10)
  })

  it("uses the SECOND keyframe's ease: power2In gives 0.25 at the midpoint", () => {
    const keyframes = [kf('a', 0, { opacity: 0 }), kf('b', 1, { opacity: 1 }, 'power2In')]
    expect(interpolateProperty(keyframes, 'opacity', 0.5)).toBe(0.25)
  })

  it("ignores the FIRST keyframe's ease", () => {
    const keyframes = [kf('a', 0, { opacity: 0 }, 'power2In'), kf('b', 1, { opacity: 1 })]
    expect(interpolateProperty(keyframes, 'opacity', 0.5)).toBe(0.5)
  })

  it('power2Out on the second keyframe gives 75 at the midpoint of 0..100', () => {
    const keyframes = [kf('a', 0, { translateY: 0 }), kf('b', 1, { translateY: 100 }, 'power2Out')]
    expect(interpolateProperty(keyframes, 'translateY', 0.5)).toBe(75)
  })

  it('picks the right segment among three keyframes', () => {
    const keyframes = [
      kf('a', 0, { translateX: 0 }),
      kf('b', 0.5, { translateX: 100 }),
      kf('c', 1, { translateX: 0 }),
    ]
    expect(interpolateProperty(keyframes, 'translateX', 0.25)).toBe(50)
    expect(interpolateProperty(keyframes, 'translateX', 0.5)).toBe(100)
    expect(interpolateProperty(keyframes, 'translateX', 0.75)).toBe(50)
  })

  it('skips keyframes that do not define the property and uses the nearest ones', () => {
    const keyframes = [
      kf('a', 0, { opacity: 0, scale: 1 }),
      kf('b', 0.5, { opacity: 1 }),
      kf('c', 1, { scale: 2 }),
    ]
    expect(interpolateProperty(keyframes, 'scale', 0.5)).toBe(1.5)
    expect(interpolateProperty(keyframes, 'opacity', 0.75)).toBe(1)
  })

  it('a skipped keyframe does not contribute its ease', () => {
    const keyframes = [
      kf('a', 0, { scale: 0 }),
      kf('b', 0.5, { opacity: 1 }, 'power2In'),
      kf('c', 1, { scale: 1 }),
    ]
    expect(interpolateProperty(keyframes, 'scale', 0.5)).toBe(0.5)
  })
})

describe('interpolateLayer', () => {
  it('returns the defaults for a layer without keyframes', () => {
    expect(interpolateLayer(layerWith([]), 0.5)).toEqual({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      blur: 0,
    })
    expect(DEFAULT_VALUES.opacity).toBe(1)
  })

  it('combines animated properties with defaults for the rest', () => {
    const layer = layerWith([
      kf('a', 0, { opacity: 0, translateY: 20 }),
      kf('b', 1, { opacity: 1, translateY: 0 }),
    ])
    expect(interpolateLayer(layer, 0.5)).toEqual({
      translateX: 0,
      translateY: 10,
      scale: 1,
      rotate: 0,
      opacity: 0.5,
      blur: 0,
    })
  })
})
