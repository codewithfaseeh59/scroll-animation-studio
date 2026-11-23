import { createLayer, createProject } from '../document'
import type { EaseName, Keyframe, KeyframeValues, Layer, Project } from '../types'
import { generateCss, generateMarkup } from './css'

function kf(
  id: string,
  progress: number,
  values: KeyframeValues,
  ease: EaseName = 'linear',
): Keyframe {
  return { id, progress, values, ease }
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

/** Percentages of the blocks of one @keyframes rule, in the order they are written. */
function keyframePercentages(css: string, name: string): number[] {
  const rule = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n  \\}\\n`).exec(css)
  const body = rule?.[1] ?? ''
  return [...body.matchAll(/^ {4}([\d.]+)% \{/gm)].map((match) => Number(match[1]))
}

describe('generateCss structure', () => {
  it('wraps the animation in @supports for animation-timeline', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).toContain('@supports (animation-timeline: view()) {')
  })

  it('makes the scene sceneLength viewport heights tall with a named view timeline', () => {
    const css = generateCss(projectWith([], { sceneLength: 4 }))
    expect(css).toContain('  .scene {\n    height: 400vh;\n    view-timeline: --scene block;\n  }')
  })

  it('handles a fractional scene length: 2.5 gives 250vh', () => {
    expect(generateCss(projectWith([], { sceneLength: 2.5 }))).toContain('height: 250vh;')
  })

  it('makes the stage sticky only where scroll-driven animation is supported', () => {
    const css = generateCss(projectWith([]))
    expect(css).toContain('  .scene__stage {\n    position: sticky;\n    top: 0;\n  }')
    expect(css.indexOf('position: sticky;')).toBeGreaterThan(css.indexOf('@supports'))
  })

  it('sizes the frame to the aspect ratio: 16:9 is width min(100vw, 100vh * 1.7778)', () => {
    const css = generateCss(projectWith([]))
    expect(css).toContain('width: min(100vw, calc(100vh * 1.7778));')
    expect(css).toContain('aspect-ratio: 16 / 9;')
    expect(css).toContain('container-type: inline-size;')
  })

  it('has a prefers-reduced-motion block that stops animation and shows the final layout', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {')
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {'))
    expect(block).toContain('animation: none;')
    expect(block).toContain('height: auto;')
    expect(block).toContain('position: static;')
  })

  it('writes the reduced-motion block after the animation rules so that it wins', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css.indexOf('@media (prefers-reduced-motion')).toBeGreaterThan(
      css.indexOf('animation-timeline: --scene;'),
    )
  })

  it('ends with a newline', () => {
    expect(generateCss(projectWith([])).endsWith('}\n')).toBe(true)
  })
})

describe('generateCss layers', () => {
  it('positions a layer by its base in percent and styles its text', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).toContain('.scene__layer--hero-title {\n  left: 10%;\n  top: 20%;\n  width: 60%;')
    expect(css).toContain('height: 20%;')
    expect(css).toContain('color: #ffffff;')
    expect(css).toContain('font-size: 4.8cqw;')
  })

  it('styles a rectangle with its colour and radius (20 units is 2cqw)', () => {
    const rect = createLayer('r', 'rect', 'Box')
    const css = generateCss(projectWith([{ ...rect, style: { ...rect.style, radius: 20 } }]))
    expect(css).toContain('background: #4f46e5;')
    expect(css).toContain('border-radius: 2cqw;')
  })

  it('writes the final animated values as the layer default, leaving out neutral ones', () => {
    const css = generateCss(projectWith([heroTitle()]))
    const layerRule = css.slice(css.indexOf('.scene__layer--hero-title {'))
    const ruleBody = layerRule.slice(0, layerRule.indexOf('\n}'))
    expect(ruleBody).toContain('translate: 0% -10%;')
    expect(ruleBody).not.toContain('opacity')
  })

  it('animates every property of a layer with its own keyframes', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).toContain(
      '  .scene__layer--hero-title {\n' +
        '    animation: scene-hero-title-translate 1ms linear both, scene-hero-title-opacity 1ms linear both;\n' +
        '    animation-timeline: --scene;\n' +
        '    animation-range: contain 0% contain 100%;\n' +
        '  }',
    )
  })

  it('writes the opacity keyframes with the ease of the next keyframe on the stop before it', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).toContain(
      '  @keyframes scene-hero-title-opacity {\n' +
        '    0% {\n' +
        '      opacity: 0;\n' +
        '      animation-timing-function: cubic-bezier(0.5, 1, 0.89, 1);\n' +
        '    }\n' +
        '    50% {\n' +
        '      opacity: 1;\n' +
        '    }\n' +
        '    100% {\n' +
        '      opacity: 1;\n' +
        '    }\n' +
        '  }',
    )
  })

  it('combines translateX and translateY into one translate property', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).toContain('      translate: 0% 20%;')
    expect(css).toContain('      translate: 0% -10%;')
  })

  it('leaves a layer without keyframes static, with no animation rules', () => {
    const css = generateCss(projectWith([createLayer('r', 'rect', 'Box')]))
    expect(css).toContain('.scene__layer--box {')
    expect(css).not.toContain('@keyframes')
    expect(css).not.toContain('animation: scene-')
  })

  it('treats a property set by a single keyframe as static: no keyframes, value in the layer rule', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0.4, { opacity: 0.5 })],
    }
    const css = generateCss(projectWith([layer]))
    expect(css).not.toContain('@keyframes')
    expect(css).toContain('opacity: 0.5;')
  })

  it('emits a property only between the keyframes that set it: the middle keyframe is skipped for scale', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [
        kf('k0', 0, { scale: 1, opacity: 0 }),
        kf('k1', 0.5, { opacity: 1 }, 'power2In'),
        kf('k2', 1, { scale: 2 }, 'sineInOut'),
      ],
    }
    const css = generateCss(projectWith([layer]))
    expect(keyframePercentages(css, 'scene-box-scale')).toEqual([0, 100])
    expect(keyframePercentages(css, 'scene-box-opacity')).toEqual([0, 50, 100])
    expect(css).toContain(
      '      scale: 1;\n      animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);',
    )
  })

  it('holds the first value before the first keyframe: 0% repeats the value at 30%', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0.3, { opacity: 0.2 }), kf('k1', 0.6, { opacity: 1 }, 'easeIn')],
    }
    const css = generateCss(projectWith([layer]))
    expect(keyframePercentages(css, 'scene-box-opacity')).toEqual([0, 30, 60, 100])
    expect(css).toContain(
      '    0% {\n      opacity: 0.2;\n    }\n    30% {\n      opacity: 0.2;\n      animation-timing-function: ease-in;\n    }',
    )
  })

  it('writes keyframe percentages sorted and within 0 to 100', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [
        kf('k0', 0.2, { opacity: 0 }),
        kf('k1', 0.5, { opacity: 1 }),
        kf('k2', 0.9, { opacity: 0.5 }),
      ],
    }
    const percentages = keyframePercentages(generateCss(projectWith([layer])), 'scene-box-opacity')
    expect(percentages).toEqual([0, 20, 50, 90, 100])
    expect([...percentages].sort((a, b) => a - b)).toEqual(percentages)
    expect(Math.min(...percentages)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...percentages)).toBeLessThanOrEqual(100)
  })

  it('formats a third as 33.3333% and omits the timing function for linear', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [
        kf('k0', 0, { rotate: 0 }),
        kf('k1', 1 / 3, { rotate: 90 }),
        kf('k2', 1, { rotate: 0 }),
      ],
    }
    const css = generateCss(projectWith([layer]))
    expect(keyframePercentages(css, 'scene-box-rotate')).toEqual([0, 33.3333, 100])
    expect(css).toContain('rotate: 90deg;')
    expect(css).not.toContain('animation-timing-function: linear')
  })

  it('writes blur as a filter', () => {
    const layer = {
      ...createLayer('r', 'rect', 'Box'),
      keyframes: [kf('k0', 0, { blur: 10 }), kf('k1', 1, { blur: 0 })],
    }
    const css = generateCss(projectWith([layer]))
    expect(css).toContain('filter: blur(10px);')
    expect(css).toContain('filter: blur(0px);')
  })

  it('gives every layer its own unique class', () => {
    const css = generateCss(
      projectWith([createLayer('a', 'rect', 'Box'), createLayer('b', 'rect', 'Box')]),
    )
    expect(css).toContain('.scene__layer--box {')
    expect(css).toContain('.scene__layer--box-2 {')
  })

  it('does not let a colour carry extra CSS into the output', () => {
    const rect = createLayer('r', 'rect', 'Box')
    const css = generateCss(
      projectWith([{ ...rect, style: { ...rect.style, color: 'red; } body { display: none' } }]),
    )
    expect(css).toContain('background: #000000;')
    expect(css).not.toContain('display: none')
  })

  it('uses only the individual transform properties, never a transform shorthand', () => {
    const css = generateCss(projectWith([heroTitle()]))
    expect(css).not.toMatch(/\btransform:/)
  })
})

describe('generateMarkup', () => {
  it('nests layers in scene, stage and frame, bottom layer first', () => {
    const markup = generateMarkup(
      projectWith([createLayer('a', 'rect', 'Box'), createLayer('b', 'text', 'Title')]),
    )
    expect(markup).toBe(
      '<div class="scene">\n' +
        '  <div class="scene__stage">\n' +
        '    <div class="scene__frame">\n' +
        '      <div class="scene__layer scene__layer--box" aria-hidden="true"></div>\n' +
        '      <div class="scene__layer scene__layer--title">Text</div>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</div>\n',
    )
  })

  it('escapes layer text', () => {
    const layer = createLayer('t', 'text', 'Title')
    const markup = generateMarkup(
      projectWith([{ ...layer, style: { ...layer.style, text: '<b>Tom & Jerry</b>' } }]),
    )
    expect(markup).toContain('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;')
    expect(markup).not.toContain('<b>')
  })

  it('renders an image with its source and the layer name as alt text', () => {
    const layer = createLayer('i', 'image', 'Photo "one"')
    const markup = generateMarkup(
      projectWith([{ ...layer, style: { ...layer.style, src: '/a.png?x=1&y=2' } }]),
    )
    expect(markup).toContain(
      '<img class="scene__layer scene__layer--photo-one" src="/a.png?x=1&amp;y=2" alt="Photo &quot;one&quot;">',
    )
  })

  it('renders an image without a source as a labelled box, not an empty src', () => {
    const markup = generateMarkup(projectWith([createLayer('i', 'image', 'Photo')]))
    expect(markup).toContain('role="img" aria-label="Photo"')
    expect(markup).not.toContain('<img')
  })
})
