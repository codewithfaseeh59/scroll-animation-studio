import { validateProject } from './validate'

type Raw = Record<string, unknown>

function rawKeyframe(overrides: Raw = {}): Raw {
  return {
    id: 'k1',
    progress: 0,
    values: { opacity: 0, translateY: 20 },
    ease: 'linear',
    ...overrides,
  }
}

function rawLayer(overrides: Raw = {}): Raw {
  return {
    id: 'l1',
    name: 'Title',
    type: 'text',
    base: { x: 10, y: 20, width: 50, height: 30 },
    style: { color: '#ff0000', text: 'Hello', fontSize: 32, src: '', radius: 0 },
    keyframes: [
      rawKeyframe(),
      rawKeyframe({ id: 'k2', progress: 0.5, values: { opacity: 1 }, ease: 'power2Out' }),
    ],
    ...overrides,
  }
}

function rawProject(overrides: Raw = {}): Raw {
  return {
    version: 1,
    name: 'Demo',
    sceneLength: 4,
    aspectRatio: { width: 16, height: 9 },
    layers: [rawLayer()],
    ...overrides,
  }
}

function errorsOf(input: unknown): string[] {
  const result = validateProject(input)
  if (result.ok) throw new Error('expected validation to fail')
  return result.errors
}

describe('validateProject', () => {
  it('accepts a valid project and returns it unchanged', () => {
    const result = validateProject(rawProject())
    expect(result).toEqual({ ok: true, project: rawProject() })
  })

  it('accepts an empty project with no layers', () => {
    expect(validateProject(rawProject({ layers: [] })).ok).toBe(true)
  })

  it('drops unknown extra fields', () => {
    const result = validateProject(rawProject({ hack: true }))
    expect(result.ok && 'hack' in result.project).toBe(false)
  })

  it.each([null, undefined, 'text', 42, [], true])('rejects non-object input %j', (input) => {
    expect(errorsOf(input)).toEqual(['project: must be an object'])
  })

  it('rejects the wrong version', () => {
    expect(errorsOf(rawProject({ version: 2 }))).toEqual(['project.version: must be 1'])
  })

  it.each([0, -1, Number.NaN, Infinity, '4'])('rejects sceneLength %j', (sceneLength) => {
    expect(errorsOf(rawProject({ sceneLength }))).toHaveLength(1)
  })

  it('rejects a zero aspect ratio side with a precise path', () => {
    expect(errorsOf(rawProject({ aspectRatio: { width: 0, height: 9 } }))).toEqual([
      'project.aspectRatio.width: must be greater than 0',
    ])
  })

  it('rejects an unknown layer type', () => {
    expect(errorsOf(rawProject({ layers: [rawLayer({ type: 'circle' })] }))).toEqual([
      'project.layers[0].type: must be one of rect, text, image',
    ])
  })

  it('rejects a layer with zero width', () => {
    const layer = rawLayer({ base: { x: 0, y: 0, width: 0, height: 10 } })
    expect(errorsOf(rawProject({ layers: [layer] }))).toEqual([
      'project.layers[0].base.width: must be greater than 0',
    ])
  })

  it('rejects duplicate layer ids', () => {
    const layers = [rawLayer(), rawLayer({ name: 'Copy' })]
    expect(errorsOf(rawProject({ layers }))).toEqual(['project.layers[1].id: duplicate id "l1"'])
  })

  it('rejects keyframe progress outside 0..1', () => {
    const layer = rawLayer({ keyframes: [rawKeyframe({ progress: 1.5 })] })
    expect(errorsOf(rawProject({ layers: [layer] }))).toEqual([
      'project.layers[0].keyframes[0].progress: must be at most 1',
    ])
  })

  it('rejects keyframes that are not strictly ascending by progress', () => {
    const unsorted = rawLayer({
      keyframes: [rawKeyframe({ progress: 0.5 }), rawKeyframe({ id: 'k2', progress: 0.2 })],
    })
    const duplicate = rawLayer({
      keyframes: [rawKeyframe({ progress: 0.5 }), rawKeyframe({ id: 'k2', progress: 0.5 })],
    })
    const expected = [
      'project.layers[0].keyframes[1].progress: must be greater than the previous keyframe progress',
    ]
    expect(errorsOf(rawProject({ layers: [unsorted] }))).toEqual(expected)
    expect(errorsOf(rawProject({ layers: [duplicate] }))).toEqual(expected)
  })

  it('rejects duplicate keyframe ids inside a layer', () => {
    const layer = rawLayer({
      keyframes: [rawKeyframe(), rawKeyframe({ progress: 0.5 })],
    })
    expect(errorsOf(rawProject({ layers: [layer] }))).toEqual([
      'project.layers[0].keyframes[1].id: duplicate id "k1"',
    ])
  })

  it('rejects an unknown animatable property', () => {
    const layer = rawLayer({ keyframes: [rawKeyframe({ values: { skew: 5 } })] })
    expect(errorsOf(rawProject({ layers: [layer] }))).toEqual([
      'project.layers[0].keyframes[0].values.skew: is not an animatable property',
    ])
  })

  it('rejects opacity above 1 and negative blur', () => {
    const layer = rawLayer({ keyframes: [rawKeyframe({ values: { opacity: 2, blur: -1 } })] })
    expect(errorsOf(rawProject({ layers: [layer] }))).toEqual([
      'project.layers[0].keyframes[0].values.opacity: must be at most 1',
      'project.layers[0].keyframes[0].values.blur: must be at least 0',
    ])
  })

  it('rejects an unknown ease', () => {
    const layer = rawLayer({ keyframes: [rawKeyframe({ ease: 'bounce' })] })
    expect(errorsOf(rawProject({ layers: [layer] }))).toEqual([
      'project.layers[0].keyframes[0].ease: must be one of linear, easeIn, easeOut, easeInOut, power2In, power2Out, power2InOut, sineInOut',
    ])
  })

  it('reports every problem at once', () => {
    const errors = errorsOf(rawProject({ name: 5, sceneLength: 0, layers: 'nope' }))
    expect(errors).toEqual([
      'project.name: must be a string',
      'project.sceneLength: must be greater than 0',
      'project.layers: must be an array',
    ])
  })
})
