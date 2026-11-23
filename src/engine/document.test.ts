import {
  addLayer,
  createLayer,
  createProject,
  getLayer,
  nextLayerName,
  removeKeyframe,
  removeLayer,
  updateKeyframe,
  updateLayer,
  upsertKeyframe,
} from './document'
import type { EaseName, Keyframe, KeyframeValues, Layer, Project } from './types'
import { validateProject } from './validate'

function kf(
  id: string,
  progress: number,
  values: KeyframeValues,
  ease: EaseName = 'linear',
): Keyframe {
  return { id, progress, values, ease }
}

function makeLayer(id: string, keyframes: Keyframe[] = []): Layer {
  return {
    id,
    name: `Layer ${id}`,
    type: 'rect',
    base: { x: 10, y: 20, width: 30, height: 40 },
    style: { color: '#ff0000', text: '', fontSize: 16, src: '', radius: 0 },
    keyframes,
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

function projectWith(layers: Layer[]): Project {
  return { ...createProject(), layers }
}

function progressesOf(project: Project, layerId: string): number[] {
  return (getLayer(project, layerId)?.keyframes ?? []).map((keyframe) => keyframe.progress)
}

describe('createProject', () => {
  it('creates a valid empty project of 4 viewport heights at 16:9', () => {
    const project = createProject()
    expect(project.sceneLength).toBe(4)
    expect(project.aspectRatio).toEqual({ width: 16, height: 9 })
    expect(project.layers).toEqual([])
    expect(validateProject(project).ok).toBe(true)
  })
})

describe('addLayer and removeLayer', () => {
  it('adds a layer at the end without mutating the original', () => {
    const original = deepFreeze(projectWith([makeLayer('a')]))
    const next = addLayer(original, makeLayer('b'))
    expect(next.layers.map((layer) => layer.id)).toEqual(['a', 'b'])
    expect(original.layers).toHaveLength(1)
    expect(next).not.toBe(original)
    expect(next.layers[0]).toBe(original.layers[0])
  })

  it('ignores a layer whose id already exists', () => {
    const original = projectWith([makeLayer('a')])
    expect(addLayer(original, makeLayer('a'))).toBe(original)
  })

  it('removes a layer together with its keyframes', () => {
    const original = deepFreeze(
      projectWith([makeLayer('a', [kf('k1', 0, { opacity: 0 })]), makeLayer('b')]),
    )
    const next = removeLayer(original, 'a')
    expect(next.layers.map((layer) => layer.id)).toEqual(['b'])
    expect(JSON.stringify(next)).not.toContain('k1')
    expect(original.layers).toHaveLength(2)
  })

  it('returns the same project when the layer does not exist', () => {
    const original = projectWith([makeLayer('a')])
    expect(removeLayer(original, 'missing')).toBe(original)
  })
})

describe('updateLayer', () => {
  it('merges base and style patches and renames, without mutating', () => {
    const original = deepFreeze(projectWith([makeLayer('a'), makeLayer('b')]))
    const next = updateLayer(original, 'a', {
      name: 'Hero',
      base: { x: 50 },
      style: { color: '#00ff00' },
    })
    const updated = getLayer(next, 'a')
    expect(updated?.name).toBe('Hero')
    expect(updated?.base).toEqual({ x: 50, y: 20, width: 30, height: 40 })
    expect(updated?.style.color).toBe('#00ff00')
    expect(updated?.style.fontSize).toBe(16)
    expect(getLayer(original, 'a')?.base.x).toBe(10)
    expect(getLayer(next, 'b')).toBe(getLayer(original, 'b'))
  })

  it('returns the same project for an unknown layer', () => {
    const original = projectWith([makeLayer('a')])
    expect(updateLayer(original, 'missing', { name: 'x' })).toBe(original)
  })
})

describe('upsertKeyframe', () => {
  it('inserts keyframes keeping them sorted by progress', () => {
    let project = deepFreeze(projectWith([makeLayer('a')]))
    project = upsertKeyframe(project, 'a', kf('k1', 0.8, { opacity: 1 }))
    project = upsertKeyframe(project, 'a', kf('k2', 0.2, { opacity: 0 }))
    project = upsertKeyframe(project, 'a', kf('k3', 0.5, { opacity: 0.5 }))
    expect(progressesOf(project, 'a')).toEqual([0.2, 0.5, 0.8])
  })

  it('merges values into an existing keyframe at the same progress, keeping its id and ease', () => {
    const original = deepFreeze(
      projectWith([makeLayer('a', [kf('k1', 0.5, { opacity: 0.5 }, 'power2In')])]),
    )
    const next = upsertKeyframe(original, 'a', kf('other', 0.5, { scale: 2 }))
    const keyframes = getLayer(next, 'a')?.keyframes
    expect(keyframes).toEqual([kf('k1', 0.5, { opacity: 0.5, scale: 2 }, 'power2In')])
    expect(getLayer(original, 'a')?.keyframes[0]?.values).toEqual({ opacity: 0.5 })
  })

  it('treats progress values within 1e-6 as the same moment', () => {
    const original = projectWith([makeLayer('a', [kf('k1', 0.3, { opacity: 0 })])])
    const next = upsertKeyframe(original, 'a', kf('k2', 0.3 + 1e-9, { scale: 2 }))
    expect(getLayer(next, 'a')?.keyframes).toHaveLength(1)
  })

  it('overwrites a value that already exists at that progress', () => {
    const original = projectWith([makeLayer('a', [kf('k1', 0.5, { opacity: 0.5 })])])
    const next = upsertKeyframe(original, 'a', kf('k2', 0.5, { opacity: 0.9 }))
    expect(getLayer(next, 'a')?.keyframes[0]?.values.opacity).toBe(0.9)
  })

  it('clamps progress to 0..1', () => {
    let project = projectWith([makeLayer('a')])
    project = upsertKeyframe(project, 'a', kf('k1', -0.5, { opacity: 0 }))
    project = upsertKeyframe(project, 'a', kf('k2', 1.5, { opacity: 1 }))
    expect(progressesOf(project, 'a')).toEqual([0, 1])
  })

  it('ignores a new keyframe whose id is already used by the layer', () => {
    const original = projectWith([makeLayer('a', [kf('k1', 0.5, { opacity: 0.5 })])])
    expect(upsertKeyframe(original, 'a', kf('k1', 0.9, { opacity: 1 }))).toBe(original)
  })

  it('returns the same project for an unknown layer', () => {
    const original = projectWith([makeLayer('a')])
    expect(upsertKeyframe(original, 'missing', kf('k1', 0.5, {}))).toBe(original)
  })
})

describe('updateKeyframe', () => {
  const base = (): Project =>
    deepFreeze(
      projectWith([
        makeLayer('a', [
          kf('k1', 0.2, { opacity: 0 }),
          kf('k2', 0.5, { opacity: 1 }),
          kf('k3', 0.9, { opacity: 0 }),
        ]),
      ]),
    )

  it('re-sorts when a keyframe moves past another', () => {
    const next = updateKeyframe(base(), 'a', 'k1', { progress: 0.7 })
    expect(getLayer(next, 'a')?.keyframes.map((keyframe) => keyframe.id)).toEqual([
      'k2',
      'k1',
      'k3',
    ])
    expect(progressesOf(next, 'a')).toEqual([0.5, 0.7, 0.9])
  })

  it('changes ease and replaces values', () => {
    const next = updateKeyframe(base(), 'a', 'k2', { ease: 'sineInOut', values: { scale: 3 } })
    expect(getLayer(next, 'a')?.keyframes[1]).toEqual(kf('k2', 0.5, { scale: 3 }, 'sineInOut'))
  })

  it('clamps progress to 0..1', () => {
    const next = updateKeyframe(base(), 'a', 'k3', { progress: 4 })
    expect(progressesOf(next, 'a')).toEqual([0.2, 0.5, 1])
  })

  it('refuses to move a keyframe onto another one', () => {
    const original = base()
    expect(updateKeyframe(original, 'a', 'k1', { progress: 0.5 })).toBe(original)
  })

  it('returns the same project for an unknown keyframe or layer', () => {
    const original = base()
    expect(updateKeyframe(original, 'a', 'missing', { ease: 'linear' })).toBe(original)
    expect(updateKeyframe(original, 'missing', 'k1', { ease: 'linear' })).toBe(original)
  })
})

describe('removeKeyframe', () => {
  it('removes only the chosen keyframe and keeps the order', () => {
    const original = deepFreeze(
      projectWith([makeLayer('a', [kf('k1', 0.1, {}), kf('k2', 0.5, {}), kf('k3', 0.9, {})])]),
    )
    const next = removeKeyframe(original, 'a', 'k2')
    expect(progressesOf(next, 'a')).toEqual([0.1, 0.9])
    expect(progressesOf(original, 'a')).toEqual([0.1, 0.5, 0.9])
  })

  it('returns the same project for an unknown keyframe', () => {
    const original = projectWith([makeLayer('a', [kf('k1', 0.1, {})])])
    expect(removeKeyframe(original, 'a', 'missing')).toBe(original)
  })
})

describe('results stay valid projects', () => {
  it('a sequence of operations still passes validateProject', () => {
    let project = createProject()
    project = addLayer(project, makeLayer('a'))
    project = upsertKeyframe(project, 'a', kf('k1', 0.9, { opacity: 1 }))
    project = upsertKeyframe(project, 'a', kf('k2', 0.1, { opacity: 0 }))
    project = updateKeyframe(project, 'a', 'k2', { progress: 0.3 })
    project = updateLayer(project, 'a', { base: { width: 55 } })
    expect(validateProject(project).ok).toBe(true)
  })
})

describe('createLayer', () => {
  it('creates a rectangle with its defaults and no keyframes', () => {
    expect(createLayer('r1', 'rect', 'Box')).toEqual({
      id: 'r1',
      name: 'Box',
      type: 'rect',
      base: { x: 30, y: 30, width: 40, height: 40 },
      style: { color: '#4f46e5', text: '', fontSize: 16, src: '', radius: 0 },
      keyframes: [],
    })
  })

  it('creates a text layer showing "Text" at font size 48', () => {
    const layer = createLayer('t1', 'text', 'Title')
    expect(layer.base).toEqual({ x: 20, y: 40, width: 60, height: 20 })
    expect(layer.style.text).toBe('Text')
    expect(layer.style.fontSize).toBe(48)
  })

  it('creates an image layer with an empty source', () => {
    const layer = createLayer('i1', 'image', 'Photo')
    expect(layer.base).toEqual({ x: 25, y: 25, width: 50, height: 50 })
    expect(layer.style.src).toBe('')
  })

  it('every type produces a layer that passes validation', () => {
    let project = createProject()
    project = addLayer(project, createLayer('a', 'rect', 'A'))
    project = addLayer(project, createLayer('b', 'text', 'B'))
    project = addLayer(project, createLayer('c', 'image', 'C'))
    expect(validateProject(project).ok).toBe(true)
  })

  it('does not share base or style objects between layers', () => {
    const first = createLayer('a', 'rect', 'A')
    const second = createLayer('b', 'rect', 'B')
    expect(first.base).not.toBe(second.base)
    expect(first.style).not.toBe(second.style)
  })
})

describe('nextLayerName', () => {
  it('counts the layers of the same type: Rectangle 1, then Rectangle 2, Text 2', () => {
    const empty = createProject()
    expect(nextLayerName(empty, 'rect')).toBe('Rectangle 1')
    const project = projectWith([
      createLayer('a', 'rect', 'Rectangle 1'),
      createLayer('b', 'text', 'Text 1'),
      createLayer('c', 'text', 'Text 2'),
    ])
    expect(nextLayerName(project, 'rect')).toBe('Rectangle 2')
    expect(nextLayerName(project, 'text')).toBe('Text 3')
    expect(nextLayerName(project, 'image')).toBe('Image 1')
  })
})
