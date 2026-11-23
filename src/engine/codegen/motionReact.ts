import { DEFAULT_VALUES, interpolateProperty } from '../interpolate'
import {
  EASE_NAMES,
  type AnimatableProperty,
  type EaseName,
  type Layer,
  type Project,
} from '../types'
import { toStageUnits } from '../units'
import { camelCase, formatNumber, indent, layerSlugs, safeCssColor } from './shared'

/**
 * How each easing is written into the generated file. Motion's useTransform
 * takes easing functions, so the generated code carries its own copies of the
 * functions it uses. They match engine/ease.ts.
 */
export const EASE_SOURCES: Record<EaseName, string> = {
  linear: '(t) => t',
  easeIn: 'cubicBezier(0.42, 0, 1, 1)',
  easeOut: 'cubicBezier(0, 0, 0.58, 1)',
  easeInOut: 'cubicBezier(0.42, 0, 0.58, 1)',
  power2In: '(t) => t * t',
  power2Out: '(t) => 1 - (1 - t) * (1 - t)',
  power2InOut: '(t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)',
  sineInOut: '(t) => (1 - Math.cos(Math.PI * t)) / 2',
}

export const CUBIC_BEZIER_SOURCE = `function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const at = (s: number, a: number, b: number) =>
    3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s
  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let low = 0
    let high = 1
    for (let i = 0; i < 30; i++) {
      const middle = (low + high) / 2
      if (at(middle, x1, x2) < t) low = middle
      else high = middle
    }
    return at((low + high) / 2, y1, y2)
  }
}`

const CUBIC_BEZIER_EASES: readonly EaseName[] = ['easeIn', 'easeOut', 'easeInOut']

/** One animatable property and how it is written as a style value. */
interface PropertyFormat {
  /** The key in a motion element's style. */
  styleKey: string
  /** The name part of the generated variable, such as "Opacity" in "titleOpacity". */
  variableSuffix: string
  format: (value: number) => string
}

const PROPERTIES: Record<AnimatableProperty, PropertyFormat> = {
  translateX: {
    styleKey: 'x',
    variableSuffix: 'X',
    format: (value) => `"${formatNumber(value)}%"`,
  },
  translateY: {
    styleKey: 'y',
    variableSuffix: 'Y',
    format: (value) => `"${formatNumber(value)}%"`,
  },
  scale: { styleKey: 'scale', variableSuffix: 'Scale', format: formatNumber },
  rotate: { styleKey: 'rotate', variableSuffix: 'Rotate', format: formatNumber },
  opacity: { styleKey: 'opacity', variableSuffix: 'Opacity', format: formatNumber },
  blur: {
    styleKey: 'filter',
    variableSuffix: 'Filter',
    format: (value) => `"blur(${formatNumber(value)}px)"`,
  },
}

const PROPERTY_ORDER: readonly AnimatableProperty[] = [
  'translateX',
  'translateY',
  'scale',
  'rotate',
  'opacity',
  'blur',
]

interface PropertyPlan {
  property: AnimatableProperty
  variable: string
  /** Scroll progress of each stop, from 0 to 1, ascending. */
  stops: number[]
  /** The written value at each stop. */
  values: string[]
  /** The easing of the way from each stop to the next, one fewer than stops. */
  eases: EaseName[]
  /** True when the value never changes, so no motion value is needed. */
  isStatic: boolean
  finalValue: string
}

/**
 * The stops of one property of a layer, or null when no keyframe sets it. Stops
 * sit at the keyframes that set the property plus 0 and 1, where the first and
 * last values are held. The ease of a keyframe shapes the way into it.
 */
function planProperty(
  layer: Layer,
  property: AnimatableProperty,
  variableBase: string,
): PropertyPlan | null {
  const defining = layer.keyframes.filter((keyframe) => keyframe.values[property] !== undefined)
  if (defining.length === 0) return null

  const { format, variableSuffix } = PROPERTIES[property]
  const stops = [...new Set([0, ...defining.map((keyframe) => keyframe.progress), 1])].sort(
    (a, b) => a - b,
  )
  const values = stops.map((progress) =>
    format(interpolateProperty(layer.keyframes, property, progress) ?? DEFAULT_VALUES[property]),
  )
  const eases = stops
    .slice(0, -1)
    .map(
      (_, index) =>
        defining.find((keyframe) => keyframe.progress === stops[index + 1])?.ease ?? 'linear',
    )
  const finalValue = values[values.length - 1] ?? ''
  return {
    property,
    variable: `${variableBase}${variableSuffix}`,
    stops,
    values,
    eases,
    isStatic: values.every((value) => value === finalValue),
    finalValue,
  }
}

interface LayerPlan {
  layer: Layer
  /** Every property the layer sets. */
  plans: PropertyPlan[]
}

function planLayer(layer: Layer, slug: string): LayerPlan {
  const variableBase = camelCase(slug)
  const plans = PROPERTY_ORDER.flatMap(
    (property) => planProperty(layer, property, variableBase) ?? [],
  )
  return { layer, plans }
}

function easeExpression(eases: readonly EaseName[]): string | null {
  if (eases.every((name) => name === 'linear')) return null
  const [only] = eases
  return eases.length === 1 && only ? `{ ease: ${only} }` : `{ ease: [${eases.join(', ')}] }`
}

function transformLine(plan: PropertyPlan): string {
  const options = easeExpression(plan.eases)
  const parts = [
    'scrollYProgress',
    `[${plan.stops.map(formatNumber).join(', ')}]`,
    `[${plan.values.join(', ')}]`,
  ]
  if (options) parts.push(options)
  return `const ${plan.variable} = useTransform(${parts.join(', ')})`
}

function styleObject(entries: readonly string[]): string {
  return `{\n${entries.map((entry) => indent(`${entry},`, 1)).join('\n')}\n}`
}

function contentEntries(layer: Layer): string[] {
  const { color, fontSize, radius } = layer.style
  const text = (value: string): string => JSON.stringify(value)
  switch (layer.type) {
    case 'rect':
      return [
        `backgroundColor: ${text(safeCssColor(color))}`,
        `borderRadius: ${text(toStageUnits(radius))}`,
      ]
    case 'text':
      return [
        `color: ${text(safeCssColor(color))}`,
        `fontSize: ${text(toStageUnits(fontSize))}`,
        'display: "flex"',
        'alignItems: "center"',
        'justifyContent: "center"',
        'textAlign: "center"',
        'whiteSpace: "pre-wrap"',
      ]
    case 'image':
      return [`borderRadius: ${text(toStageUnits(radius))}`, 'objectFit: "cover"']
  }
}

const PLAIN_ATTRIBUTE = /^[^"\\&{}<>\r\n]*$/

/**
 * A string as a JSX attribute value. JSX attribute strings have no escape
 * sequences, so only text without special characters is written as "text";
 * anything else goes in an expression, {"..."}, which is an ordinary string.
 */
function jsxString(value: string): string {
  return PLAIN_ATTRIBUTE.test(value) ? `"${value}"` : `{${JSON.stringify(value)}}`
}

function layerElement({ layer, plans }: LayerPlan): string {
  const { x, y, width, height } = layer.base
  const staticEntries = plans
    .filter((plan) => plan.isStatic)
    .filter(
      (plan) => plan.finalValue !== PROPERTIES[plan.property].format(DEFAULT_VALUES[plan.property]),
    )
    .map((plan) => `${PROPERTIES[plan.property].styleKey}: ${plan.finalValue}`)
  const animated = plans.filter((plan) => !plan.isStatic)

  const entries = [
    'position: "absolute"',
    `left: "${formatNumber(x)}%"`,
    `top: "${formatNumber(y)}%"`,
    `width: "${formatNumber(width)}%"`,
    `height: "${formatNumber(height)}%"`,
    ...contentEntries(layer),
    ...staticEntries,
  ]
  if (animated.length > 0) {
    const final = animated.map(
      (plan) => `${PROPERTIES[plan.property].styleKey}: ${plan.finalValue}`,
    )
    const live = animated.map((plan) => `${PROPERTIES[plan.property].styleKey}: ${plan.variable}`)
    entries.push(`...(reduceMotion ? { ${final.join(', ')} } : { ${live.join(', ')} })`)
  }
  const style = `style={${styleObject(entries)}}`

  switch (layer.type) {
    case 'rect':
      return `<motion.div aria-hidden="true" ${style} />`
    case 'text':
      return `<motion.div ${style}>{${JSON.stringify(layer.style.text)}}</motion.div>`
    case 'image':
      return layer.style.src === ''
        ? `<motion.div role="img" aria-label=${jsxString(layer.name)} ${style} />`
        : `<motion.img src=${jsxString(layer.style.src)} alt=${jsxString(layer.name)} ${style} />`
  }
}

/**
 * A React + TypeScript component that plays the project with Motion: useScroll
 * tracks a tall scene and useTransform maps its progress to each layer's
 * values. With reduced motion the layers show their final state and the scene
 * is not tall. Imports come from "motion/react" (and useRef from "react").
 */
export function generateMotionReact(project: Project): string {
  const slugs = layerSlugs(project.layers)
  const layerPlans = project.layers.map((layer) =>
    planLayer(layer, slugs.get(layer.id) ?? layer.id),
  )
  const animated = layerPlans.flatMap(({ plans }) => plans.filter((plan) => !plan.isStatic))

  const eased = animated.filter((plan) => easeExpression(plan.eases) !== null)
  const usedEases = new Set(eased.flatMap((plan) => plan.eases))
  const easeNames = EASE_NAMES.filter((name) => usedEases.has(name))
  const needsBezier = easeNames.some((name) => CUBIC_BEZIER_EASES.includes(name))

  const motionImports = [
    ...(project.layers.length > 0 ? ['motion'] : []),
    'useReducedMotion',
    ...(animated.length > 0 ? ['useScroll', 'useTransform'] : []),
  ]
  const lines: string[] = [
    `import { ${motionImports.join(', ')} } from "motion/react"`,
    'import { useRef } from "react"',
    '',
  ]

  if (easeNames.length > 0) {
    lines.push('type Ease = (t: number) => number', '')
    if (needsBezier) lines.push(CUBIC_BEZIER_SOURCE, '')
    easeNames.forEach((name) => lines.push(`const ${name}: Ease = ${EASE_SOURCES[name]}`))
    lines.push('')
  }

  const body: string[] = [
    'const sceneRef = useRef<HTMLDivElement>(null)',
    'const reduceMotion = useReducedMotion()',
  ]
  if (animated.length > 0) {
    body.push(
      'const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start start", "end end"] })',
      '',
      ...animated.map(transformLine),
    )
  }

  const { width, height } = project.aspectRatio
  const layerLines = layerPlans.map((plan) => indent(layerElement(plan), 5))
  const jsx = [
    '<div',
    '  ref={sceneRef}',
    `  style={{ position: "relative", height: reduceMotion ? "auto" : "${formatNumber(project.sceneLength * 100)}vh" }}`,
    '>',
    '  <div',
    '    style={{',
    '      position: reduceMotion ? "static" : "sticky",',
    '      top: 0,',
    '      display: "grid",',
    '      placeItems: "center",',
    '      height: "100vh",',
    '    }}',
    '  >',
    '    <div',
    '      style={{',
    '        position: "relative",',
    `        width: "min(100vw, calc(100vh * ${formatNumber(width / height)}))",`,
    `        aspectRatio: "${formatNumber(width)} / ${formatNumber(height)}",`,
    '        overflow: "hidden",',
    '        containerType: "inline-size",',
    '      }}',
    '    >',
    ...layerLines,
    '    </div>',
    '  </div>',
    '</div>',
  ]

  lines.push(
    'export function ScrollScene() {',
    indent(body.join('\n'), 1),
    '',
    '  return (',
    indent(jsx.join('\n'), 2),
    '  )',
    '}',
    '',
  )
  return lines.join('\n')
}
