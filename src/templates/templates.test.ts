import ts from 'typescript'
import { generateCss } from '../engine/codegen/css'
import { generateMotionReact } from '../engine/codegen/motionReact'
import { interpolateProperty } from '../engine/interpolate'
import { parseProject, serializeProject } from '../engine/serialize'
import type { AnimatableProperty, Layer } from '../engine/types'
import { validateProject } from '../engine/validate'
import { TEMPLATES, type Template } from './index'

function template(id: string): Template {
  const found = TEMPLATES.find((item) => item.id === id)
  if (!found) throw new Error(`template ${id} missing`)
  return found
}

function layerOf(id: string, layerId: string): Layer {
  const layer = template(id).project.layers.find((item) => item.id === layerId)
  if (!layer) throw new Error(`layer ${layerId} missing`)
  return layer
}

function valueAt(
  templateId: string,
  layerId: string,
  property: AnimatableProperty,
  progress: number,
): number | undefined {
  return interpolateProperty(layerOf(templateId, layerId).keyframes, property, progress)
}

function motionSyntaxProblems(code: string): number {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    fileName: 'scene.tsx',
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  })
  return result.diagnostics?.length ?? 0
}

describe('the template list', () => {
  it('has the four templates from the brief, in this order', () => {
    expect(TEMPLATES.map((item) => item.id)).toEqual([
      'fade-up-title',
      'parallax-layers',
      'zoom-through',
      'slide-in-cards',
    ])
    expect(TEMPLATES.map((item) => item.name)).toEqual([
      'Fade-up title',
      'Parallax layers',
      'Zoom through',
      'Slide-in cards',
    ])
  })

  it('has a different id and name for every template', () => {
    expect(new Set(TEMPLATES.map((item) => item.id)).size).toBe(4)
    expect(new Set(TEMPLATES.map((item) => item.name)).size).toBe(4)
  })
})

describe.each(TEMPLATES)('template $name', (item) => {
  it('passes validation unchanged', () => {
    expect(validateProject(item.project)).toEqual({ ok: true, project: item.project })
  })

  it('survives being written to a file and read back', () => {
    expect(parseProject(serializeProject(item.project))).toEqual({
      ok: true,
      project: item.project,
    })
  })

  it('has a one-line description', () => {
    expect(item.description.length).toBeGreaterThan(10)
    expect(item.description).not.toContain('\n')
  })

  it('names its project like itself', () => {
    expect(item.project.name).toBe(item.name)
  })

  it('has a different id for every layer', () => {
    const ids = item.project.layers.map((layer) => layer.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a different id for every keyframe in the whole template', () => {
    const ids = item.project.layers.flatMap((layer) =>
      layer.keyframes.map((keyframe) => keyframe.id),
    )
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a layer with two or more keyframes', () => {
    expect(item.project.layers.some((layer) => layer.keyframes.length >= 2)).toBe(true)
  })

  it('uses at least two different easings', () => {
    const eases = item.project.layers.flatMap((layer) =>
      layer.keyframes.map((keyframe) => keyframe.ease),
    )
    expect(new Set(eases).size).toBeGreaterThanOrEqual(2)
  })

  it('fits the 16:9 stage', () => {
    expect(item.project.aspectRatio).toEqual({ width: 16, height: 9 })
    for (const layer of item.project.layers) {
      expect(layer.base.width).toBeGreaterThan(0)
      expect(layer.base.height).toBeGreaterThan(0)
    }
  })

  it('exports to CSS with keyframes', () => {
    expect(generateCss(item.project)).toContain('@keyframes')
  })

  it('exports to a Motion component without syntax errors', () => {
    expect(motionSyntaxProblems(generateMotionReact(item.project))).toBe(0)
  })
})

describe('fade-up title values', () => {
  it('title slides up while fading in: at 0.175, halfway through 0 to 0.35, power2Out gives 0.75', () => {
    expect(valueAt('fade-up-title', 'title', 'translateY', 0.175)).toBeCloseTo(10, 10)
    expect(valueAt('fade-up-title', 'title', 'opacity', 0.175)).toBeCloseTo(0.75, 10)
  })

  it('title holds fully visible between 0.35 and 0.8', () => {
    expect(valueAt('fade-up-title', 'title', 'opacity', 0.6)).toBe(1)
  })

  it('subtitle waits invisible until its first keyframe at 0.2 and ends fully in', () => {
    expect(valueAt('fade-up-title', 'subtitle', 'opacity', 0.1)).toBe(0)
    expect(valueAt('fade-up-title', 'subtitle', 'opacity', 0.9)).toBe(1)
    expect(valueAt('fade-up-title', 'subtitle', 'translateY', 0.9)).toBe(0)
  })

  it('the background has no animation', () => {
    expect(layerOf('fade-up-title', 'background').keyframes).toEqual([])
  })
})

describe('parallax layers values', () => {
  it('the sun sets with power2In: at 0.5 it has moved 150 x 0.25 = 37.5 and shrunk to 0.95', () => {
    expect(valueAt('parallax-layers', 'sun', 'translateY', 0.5)).toBe(37.5)
    expect(valueAt('parallax-layers', 'sun', 'scale', 0.5)).toBeCloseTo(0.95, 10)
  })

  it('far hills move at a constant speed: -5 at 0.25 and -10 at 0.5', () => {
    expect(valueAt('parallax-layers', 'far-hills', 'translateY', 0.25)).toBe(-5)
    expect(valueAt('parallax-layers', 'far-hills', 'translateY', 0.5)).toBe(-10)
  })

  it('near hills move three times as far as far hills in total, with easeInOut: -30 at 0.5', () => {
    expect(valueAt('parallax-layers', 'near-hills', 'translateY', 0.5)).toBeCloseTo(-30, 6)
    expect(valueAt('parallax-layers', 'near-hills', 'translateY', 1)).toBe(-60)
  })

  it('the headline fades with sineInOut: 0.5 at 0.25 and gone after 0.5', () => {
    expect(valueAt('parallax-layers', 'headline', 'opacity', 0.25)).toBeCloseTo(0.5, 10)
    expect(valueAt('parallax-layers', 'headline', 'opacity', 0.75)).toBe(0)
  })
})

describe('zoom through values', () => {
  it('the portal grows with power2In: at 0.3 its scale is 1 + 13 x 0.25 = 4.25', () => {
    expect(valueAt('zoom-through', 'portal', 'scale', 0.3)).toBeCloseTo(4.25, 10)
  })

  it('the inner portal grows faster: at 0.35 its scale is 1 + 19 x 0.25 = 5.75', () => {
    expect(valueAt('zoom-through', 'inner-portal', 'scale', 0.35)).toBeCloseTo(5.75, 10)
  })

  it('the portal is gone after 0.85', () => {
    expect(valueAt('zoom-through', 'portal', 'opacity', 0.95)).toBe(0)
    expect(valueAt('zoom-through', 'portal', 'scale', 0.95)).toBe(30)
  })

  it('the message appears late: invisible before 0.6, 0.75 and scale 0.9 at 0.8', () => {
    expect(valueAt('zoom-through', 'message', 'opacity', 0.3)).toBe(0)
    expect(valueAt('zoom-through', 'message', 'opacity', 0.8)).toBeCloseTo(0.75, 10)
    expect(valueAt('zoom-through', 'message', 'scale', 0.8)).toBeCloseTo(0.9, 10)
  })
})

describe('slide-in cards values', () => {
  it('card 1 slides in with power2Out: at 0.225 it is at 120 - 120 x 0.75 = 30', () => {
    expect(valueAt('slide-in-cards', 'card-1', 'translateX', 0.225)).toBeCloseTo(30, 10)
    expect(valueAt('slide-in-cards', 'card-1', 'opacity', 0.225)).toBeCloseTo(0.75, 10)
  })

  it('card 3 slides in with sineInOut: halfway through its range it is at 60', () => {
    expect(valueAt('slide-in-cards', 'card-3', 'translateX', 0.625)).toBeCloseTo(60, 10)
  })

  it('card 2 waits off screen to the right until 0.3', () => {
    expect(valueAt('slide-in-cards', 'card-2', 'translateX', 0.05)).toBe(120)
    expect(valueAt('slide-in-cards', 'card-2', 'opacity', 0.05)).toBe(0)
  })

  it('every card has arrived at the end', () => {
    for (const id of ['card-1', 'card-2', 'card-3']) {
      expect(valueAt('slide-in-cards', id, 'translateX', 1)).toBe(0)
      expect(valueAt('slide-in-cards', id, 'opacity', 1)).toBe(1)
    }
  })

  it('the heading fades in by 0.15', () => {
    expect(valueAt('slide-in-cards', 'heading', 'opacity', 0)).toBe(0)
    expect(valueAt('slide-in-cards', 'heading', 'opacity', 0.15)).toBe(1)
  })
})
