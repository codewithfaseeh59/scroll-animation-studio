import { migrateProject } from './migrate'
import { validateProject } from './validate'

function legacyProject(): Record<string, unknown> {
  return {
    version: 0,
    name: 'Old',
    sceneLength: 3,
    layers: [
      {
        id: 'l1',
        name: 'Box',
        type: 'rect',
        base: { x: 10, y: 20, width: 30, height: 40 },
        style: { color: '#ff0000', text: '', fontSize: 16, src: '', radius: 0 },
        keyframes: [
          { id: 'k0', progress: 0, values: { opacity: 0 } },
          { id: 'k1', progress: 1, values: { opacity: 1 }, ease: 'power2In' },
        ],
      },
    ],
  }
}

function dataOf(input: unknown): Record<string, unknown> {
  const result = migrateProject(input)
  if (!result.ok) throw new Error(result.error)
  return result.data as Record<string, unknown>
}

describe('migrateProject', () => {
  it('leaves a project of the current version as it is', () => {
    const current = { version: 1, name: 'Now' }
    const result = migrateProject(current)
    expect(result).toEqual({ ok: true, data: current })
    expect(result.ok && result.data === current).toBe(true)
  })

  it('upgrades version 0 to version 1', () => {
    expect(dataOf(legacyProject()).version).toBe(1)
  })

  it('gives a version 0 project the 16:9 aspect ratio it always had', () => {
    expect(dataOf(legacyProject()).aspectRatio).toEqual({ width: 16, height: 9 })
  })

  it('keeps an aspect ratio that a version 0 file already has', () => {
    const data = dataOf({ ...legacyProject(), aspectRatio: { width: 4, height: 3 } })
    expect(data.aspectRatio).toEqual({ width: 4, height: 3 })
  })

  it('makes missing easing linear and keeps easing that is there', () => {
    const layers = dataOf(legacyProject()).layers as { keyframes: { ease: string }[] }[]
    expect(layers[0]?.keyframes.map((keyframe) => keyframe.ease)).toEqual(['linear', 'power2In'])
  })

  it('gives a version 0 file that passes validation after the upgrade', () => {
    expect(validateProject(dataOf(legacyProject())).ok).toBe(true)
  })

  it('does not change the data it was given', () => {
    const original = legacyProject()
    const frozen = JSON.stringify(original)
    migrateProject(original)
    expect(JSON.stringify(original)).toBe(frozen)
  })

  it('does not throw on a version 0 file with a damaged shape', () => {
    expect(migrateProject({ version: 0, layers: 'nope' }).ok).toBe(true)
    expect(migrateProject({ version: 0, layers: [null, 5, { keyframes: 'x' }] }).ok).toBe(true)
  })

  it('refuses a file from a newer version, saying so', () => {
    const result = migrateProject({ version: 2 })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('newer version')
  })

  it.each([
    null,
    undefined,
    'text',
    42,
    [],
    {},
    { version: '1' },
    { version: 1.5 },
    { version: -1 },
  ])('refuses %j', (input) => {
    expect(migrateProject(input).ok).toBe(false)
  })
})
