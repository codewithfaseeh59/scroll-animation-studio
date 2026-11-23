import ts from 'typescript'
import { createLayer, createProject } from '../document'
import { ease } from '../ease'
import {
  EASE_NAMES,
  type EaseName,
  type Keyframe,
  type KeyframeValues,
  type Layer,
  type Project,
} from '../types'
import { CUBIC_BEZIER_SOURCE, EASE_SOURCES, generateMotionReact } from './motionReact'

function kf(
  id: string,
  progress: number,
  values: KeyframeValues,
  easeName: EaseName = 'linear',
): Keyframe {
  return { id, progress, values, ease: easeName }
}

function projectWith(layers: Layer[], overrides: Partial<Project> = {}): Project {
  return { ...createProject(), layers, ...overrides }
}

/** A text layer "Hero title" that fades in while sliding up, as in the fade-up template. */
function heroTitle(): Layer {
  return {
    ...createLayer('t', 'text', 'Hero title'),
    base: { x: 10, y: 20, width: 60, height: 20 },
    style: { color: '#ffffff', text: 'Hello', fontSize: 48, src: '', radius: 0 },
    keyframes: [
      kf('k0', 0, { opacity: 0, translateY: 20 }),
      kf('k1', 0.5, { opacity: 1, translateY: -10 }, 'power2Out'),
    ],
  }
}

function syntaxProblems(code: string): string[] {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    fileName: 'scene.tsx',
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  return (result.diagnostics ?? []).map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  )
}

function importedModules(code: string): string[] {
  const file = ts.createSourceFile(
    'scene.tsx',
    code,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  )
  return file.statements
    .filter(ts.isImportDeclaration)
    .flatMap((statement) =>
      ts.isStringLiteral(statement.moduleSpecifier) ? [statement.moduleSpecifier.text] : [],
    )
}

function importLine(code: string): string {
  return code.split('\n')[0] ?? ''
}

describe('generateMotionReact syntax', () => {
  it('the syntax check does notice broken code', () => {
    expect(syntaxProblems('const = ;').length).toBeGreaterThan(0)
  })

  it('has no syntax errors for an empty project', () => {
    expect(syntaxProblems(generateMotionReact(projectWith([])))).toEqual([])
  })

  it('has no syntax errors for an animated project', () => {
    expect(syntaxProblems(generateMotionReact(projectWith([heroTitle()])))).toEqual([])
  })

  it('has no syntax errors for every layer type with every easing', () => {
    const keyframes = EASE_NAMES.map((name, index) =>
      kf(
        `k${String(index)}`,
        index / EASE_NAMES.length,
        { opacity: index / 10, scale: 1 + index },
        name,
      ),
    )
    const layers = (['rect', 'text', 'image'] as const).map((type) => ({
      ...createLayer(type, type, `My ${type}`),
      keyframes,
    }))
    const withSource = layers.map((layer) =>
      layer.type === 'image' ? { ...layer, style: { ...layer.style, src: '/a.png' } } : layer,
    )
    expect(syntaxProblems(generateMotionReact(projectWith(withSource)))).toEqual([])
    expect(syntaxProblems(generateMotionReact(projectWith(layers)))).toEqual([])
  })

  it('has no syntax errors when text, names and colours contain quotes and code', () => {
    const hostile = 'a"; alert(1); //` ${x} </motion.div>{'
    const layer = createLayer('t', 'text', hostile)
    const image = createLayer('i', 'image', hostile)
    const project = projectWith([
      { ...layer, style: { ...layer.style, text: hostile, color: hostile } },
      { ...image, style: { ...image.style, src: hostile } },
    ])
    const code = generateMotionReact(project)
    expect(syntaxProblems(code)).toEqual([])
    expect(code).toContain(`{${JSON.stringify(hostile)}}`)
    expect(code).toContain(`alt={${JSON.stringify(hostile)}}`)
    expect(code).toContain(`src={${JSON.stringify(hostile)}}`)
    expect(code).toContain('color: "#000000"')
  })
})

describe('generateMotionReact imports', () => {
  it('imports Motion only from "motion/react" and nothing else but React', () => {
    const modules = importedModules(generateMotionReact(projectWith([heroTitle()])))
    expect(modules).toEqual(['motion/react', 'react'])
  })

  it('does not use the framer-motion package', () => {
    expect(generateMotionReact(projectWith([heroTitle()]))).not.toContain('framer-motion')
  })

  it('imports what an animated project uses', () => {
    expect(importLine(generateMotionReact(projectWith([heroTitle()])))).toBe(
      'import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"',
    )
  })

  it('does not import scroll hooks when nothing is animated', () => {
    const code = generateMotionReact(projectWith([createLayer('r', 'rect', 'Box')]))
    expect(importLine(code)).toBe('import { motion, useReducedMotion } from "motion/react"')
    expect(code).not.toContain('useScroll(')
    expect(code).not.toContain('useTransform(')
  })

  it('imports only useReducedMotion for an empty project', () => {
    const code = generateMotionReact(projectWith([]))
    expect(importLine(code)).toBe('import { useReducedMotion } from "motion/react"')
  })
})

describe('generateMotionReact output', () => {
  it('tracks the tall scene from the moment its top reaches the top until its bottom reaches the bottom', () => {
    const code = generateMotionReact(projectWith([heroTitle()]))
    expect(code).toContain(
      'const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start start", "end end"] })',
    )
  })

  it('makes the scene sceneLength viewport heights tall and sticky, except with reduced motion', () => {
    const code = generateMotionReact(projectWith([heroTitle()], { sceneLength: 4 }))
    expect(code).toContain('height: reduceMotion ? "auto" : "400vh"')
    expect(code).toContain('position: reduceMotion ? "static" : "sticky"')
    expect(code).toContain('const reduceMotion = useReducedMotion()')
  })

  it('sizes the frame to the aspect ratio and makes it a size container', () => {
    const code = generateMotionReact(projectWith([]))
    expect(code).toContain('width: "min(100vw, calc(100vh * 1.7778))"')
    expect(code).toContain('aspectRatio: "16 / 9"')
    expect(code).toContain('containerType: "inline-size"')
  })

  it('maps scroll progress to each property with the ease of the next keyframe on its segment', () => {
    const code = generateMotionReact(projectWith([heroTitle()]))
    expect(code).toContain(
      'const heroTitleY = useTransform(scrollYProgress, [0, 0.5, 1], ["20%", "-10%", "-10%"], { ease: [power2Out, linear] })',
    )
    expect(code).toContain(
      'const heroTitleOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 1], { ease: [power2Out, linear] })',
    )
  })

  it('shows the final values with reduced motion and the motion values otherwise', () => {
    const code = generateMotionReact(projectWith([heroTitle()]))
    expect(code).toContain(
      '...(reduceMotion ? { y: "-10%", opacity: 1 } : { y: heroTitleY, opacity: heroTitleOpacity })',
    )
  })

  it('writes the layer box, text and style', () => {
    const code = generateMotionReact(projectWith([heroTitle()]))
    expect(code).toContain('left: "10%"')
    expect(code).toContain('top: "20%"')
    expect(code).toContain('width: "60%"')
    expect(code).toContain('height: "20%"')
    expect(code).toContain('color: "#ffffff"')
    expect(code).toContain('fontSize: "4.8cqw"')
    expect(code).toContain('{"Hello"}')
  })

  it('writes only the easing functions that are used', () => {
    const code = generateMotionReact(projectWith([heroTitle()]))
    expect(code).toContain('type Ease = (t: number) => number')
    expect(code).toContain('const linear: Ease = (t) => t')
    expect(code).toContain('const power2Out: Ease = (t) => 1 - (1 - t) * (1 - t)')
    expect(code).not.toContain('power2In')
    expect(code).not.toContain('function cubicBezier')
  })

  it('writes the cubicBezier helper only when a cubic-bezier easing is used', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0, { opacity: 0 }), kf('k1', 1, { opacity: 1 }, 'easeInOut')],
    }
    const code = generateMotionReact(projectWith([layer]))
    expect(code).toContain('function cubicBezier(')
    expect(code).toContain('const easeInOut: Ease = cubicBezier(0.42, 0, 0.58, 1)')
    expect(code).toContain('{ ease: easeInOut }')
  })

  it('leaves out the ease option when every segment is linear', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0, { opacity: 0 }), kf('k1', 1, { opacity: 1 })],
    }
    const code = generateMotionReact(projectWith([layer]))
    expect(code).toContain('const boxOpacity = useTransform(scrollYProgress, [0, 1], [0, 1])')
    expect(code).not.toContain('type Ease')
  })

  it('skips keyframes that do not set a property: scale has stops only at 0 and 1', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [
        kf('k0', 0, { scale: 1, opacity: 0 }),
        kf('k1', 0.5, { opacity: 1 }, 'power2In'),
        kf('k2', 1, { scale: 2 }, 'sineInOut'),
      ],
    }
    const code = generateMotionReact(projectWith([layer]))
    expect(code).toContain(
      'const boxScale = useTransform(scrollYProgress, [0, 1], [1, 2], { ease: sineInOut })',
    )
    expect(code).toContain(
      'const boxOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 1], { ease: [power2In, linear] })',
    )
  })

  it('holds the first value before the first keyframe: stops 0, 0.3, 0.6, 1', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0.3, { opacity: 0.2 }), kf('k1', 0.6, { opacity: 1 })],
    }
    expect(generateMotionReact(projectWith([layer]))).toContain(
      'const boxOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6, 1], [0.2, 0.2, 1, 1])',
    )
  })

  it('treats a property set by one keyframe as static, with its value in the style', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0.4, { opacity: 0.5, rotate: 45 })],
    }
    const code = generateMotionReact(projectWith([layer]))
    expect(code).not.toContain('useTransform(')
    expect(code).toContain('rotate: 45,')
    expect(code).toContain('opacity: 0.5,')
  })

  it('writes blur as a filter and X and Y as separate percentages', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [
        kf('k0', 0, { blur: 10, translateX: 5 }),
        kf('k1', 1, { blur: 0, translateX: 0 }),
      ],
    }
    const code = generateMotionReact(projectWith([layer]))
    expect(code).toContain('["blur(10px)", "blur(0px)"]')
    expect(code).toContain('["5%", "0%"]')
    expect(code).toContain(
      '...(reduceMotion ? { x: "0%", filter: "blur(0px)" } : { x: boxX, filter: boxFilter })',
    )
  })

  it('renders rectangles as hidden decoration and images with their source', () => {
    const image = createLayer('i', 'image', 'Photo')
    const code = generateMotionReact(
      projectWith([
        createLayer('r', 'rect', 'Box'),
        { ...image, style: { ...image.style, src: '/a.png' } },
        createLayer('e', 'image', 'Empty'),
      ]),
    )
    expect(code).toContain('<motion.div aria-hidden="true"')
    expect(code).toContain('<motion.img src="/a.png" alt="Photo"')
    expect(code).toContain('<motion.div role="img" aria-label="Empty"')
  })

  it('replaces a colour that could carry code by black', () => {
    const rect = createLayer('r', 'rect', 'Box')
    const code = generateMotionReact(
      projectWith([{ ...rect, style: { ...rect.style, color: 'red"; alert(1); "' } }]),
    )
    expect(code).toContain('backgroundColor: "#000000"')
    expect(code).not.toContain('alert')
  })
})

describe('emitted easing functions', () => {
  function emitted(): Record<EaseName, (t: number) => number> {
    const source = [
      'type Ease = (t: number) => number',
      CUBIC_BEZIER_SOURCE,
      `exports.eases = { ${EASE_NAMES.map((name) => `${name}: ${EASE_SOURCES[name]}`).join(', ')} }`,
    ].join('\n')
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    })
    const target: { eases?: Record<EaseName, (t: number) => number> } = {}
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the code the generator emits
    const run = new Function('exports', outputText) as (exports: object) => void
    run(target)
    if (!target.eases) throw new Error('easings were not defined')
    return target.eases
  }

  it('give the hand-computed values: power2In(0.5) 0.25, power2Out(0.5) 0.75, power2InOut(0.25) 0.125', () => {
    const eases = emitted()
    expect(eases.linear(0.5)).toBe(0.5)
    expect(eases.power2In(0.5)).toBe(0.25)
    expect(eases.power2Out(0.5)).toBe(0.75)
    expect(eases.power2InOut(0.25)).toBe(0.125)
    expect(eases.sineInOut(0.5)).toBeCloseTo(0.5, 10)
  })

  it.each(EASE_NAMES)('%s returns 0 at 0 and 1 at 1', (name) => {
    const eases = emitted()
    expect(eases[name](0)).toBe(0)
    expect(eases[name](1)).toBe(1)
  })

  it.each(EASE_NAMES)('%s matches the engine easing used by the preview', (name) => {
    const eases = emitted()
    for (let step = 0; step <= 100; step++) {
      const t = step / 100
      expect(eases[name](t)).toBeCloseTo(ease(name, t), 6)
    }
  })
})
