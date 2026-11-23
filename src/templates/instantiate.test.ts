import { validateProject } from '../engine/validate'
import type { Project } from '../engine/types'
import { instantiateProject } from './instantiate'
import { TEMPLATES } from './index'

function allIds(project: Project): string[] {
  return project.layers.flatMap((layer) => [
    layer.id,
    ...layer.keyframes.map((keyframe) => keyframe.id),
  ])
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

function counter(): () => string {
  let count = 0
  return () => {
    count += 1
    return `id-${String(count)}`
  }
}

const fadeUp = TEMPLATES[0]
if (!fadeUp) throw new Error('no templates')

describe('instantiateProject', () => {
  it('gives every layer and keyframe a new id, in document order', () => {
    const copy = instantiateProject(fadeUp.project, counter())
    expect(allIds(copy).slice(0, 4)).toEqual(['id-1', 'id-2', 'id-3', 'id-4'])
    expect(allIds(copy)).toHaveLength(allIds(fadeUp.project).length)
    expect(copy.layers[0]?.id).toBe('id-1')
    expect(copy.layers[1]?.keyframes[0]?.id).toBe('id-3')
  })

  it('keeps everything else the same', () => {
    const copy = instantiateProject(fadeUp.project, counter())
    const withoutIds = (project: Project) =>
      JSON.parse(
        JSON.stringify(project, (key, value: unknown) => (key === 'id' ? undefined : value)),
      ) as unknown
    expect(withoutIds(copy)).toEqual(withoutIds(fadeUp.project))
  })

  it('makes a valid project', () => {
    expect(validateProject(instantiateProject(fadeUp.project)).ok).toBe(true)
  })

  it('uses none of the template ids', () => {
    const templateIds = new Set(allIds(fadeUp.project))
    expect(allIds(instantiateProject(fadeUp.project)).some((id) => templateIds.has(id))).toBe(false)
  })

  it('loading the same template twice shares no ids', () => {
    const first = new Set(allIds(instantiateProject(fadeUp.project)))
    const second = allIds(instantiateProject(fadeUp.project))
    expect(second.some((id) => first.has(id))).toBe(false)
    expect(new Set(second).size).toBe(second.length)
  })

  it.each(TEMPLATES)('works for the $name template', (item) => {
    const ids = allIds(instantiateProject(item.project))
    expect(new Set(ids).size).toBe(ids.length)
    expect(validateProject(instantiateProject(item.project)).ok).toBe(true)
  })

  it('does not change the template, and shares no objects with it', () => {
    const frozen = deepFreeze(structuredClone(fadeUp.project))
    const before = JSON.stringify(frozen)
    const copy = instantiateProject(frozen, counter())
    expect(JSON.stringify(frozen)).toBe(before)
    const original = frozen.layers[1]
    const changed = copy.layers[1]
    expect(changed?.base).not.toBe(original?.base)
    expect(changed?.style).not.toBe(original?.style)
    expect(changed?.keyframes[0]?.values).not.toBe(original?.keyframes[0]?.values)
    expect(copy.aspectRatio).not.toBe(frozen.aspectRatio)
  })

  it('a change to the copy does not reach the template', () => {
    const copy = instantiateProject(fadeUp.project)
    const layer = copy.layers[1]
    const keyframe = layer?.keyframes[0]
    if (!layer || !keyframe) throw new Error('layer or keyframe missing')
    layer.base.x = 99
    keyframe.values.opacity = 0.5
    expect(fadeUp.project.layers[1]?.base.x).toBe(10)
    expect(fadeUp.project.layers[1]?.keyframes[0]?.values.opacity).toBe(0)
  })
})
