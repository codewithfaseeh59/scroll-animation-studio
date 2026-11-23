import { easeToCss } from '../ease'
import { DEFAULT_VALUES, interpolateLayer, type ResolvedValues } from '../interpolate'
import type { AnimatableProperty, Layer, Project } from '../types'
import { toStageUnits } from '../units'
import { escapeHtml, formatNumber, layerSlugs, safeCssColor } from './shared'

/**
 * Each CSS property that carries animation. translateX and translateY share
 * the one `translate` property, so they are keyed together.
 */
interface Channel {
  id: string
  css: string
  properties: readonly AnimatableProperty[]
  format: (values: ResolvedValues) => string
}

const CHANNELS: readonly Channel[] = [
  {
    id: 'translate',
    css: 'translate',
    properties: ['translateX', 'translateY'],
    format: (v) => `${formatNumber(v.translateX)}% ${formatNumber(v.translateY)}%`,
  },
  { id: 'scale', css: 'scale', properties: ['scale'], format: (v) => formatNumber(v.scale) },
  {
    id: 'rotate',
    css: 'rotate',
    properties: ['rotate'],
    format: (v) => `${formatNumber(v.rotate)}deg`,
  },
  {
    id: 'opacity',
    css: 'opacity',
    properties: ['opacity'],
    format: (v) => formatNumber(v.opacity),
  },
  {
    id: 'filter',
    css: 'filter',
    properties: ['blur'],
    format: (v) => `blur(${formatNumber(v.blur)}px)`,
  },
]

interface Stop {
  progress: number
  value: string
  /** Timing function for the way from this stop to the next one; absent when linear. */
  timing: string | undefined
}

interface ChannelPlan {
  channel: Channel
  stops: Stop[]
  /** True when the value never changes, so no animation is needed. */
  isStatic: boolean
  finalValue: string
}

/**
 * The keyframe stops of one channel, or null when the layer never animates it.
 * Stops sit at every keyframe that sets the channel, plus 0% and 100%, where the
 * first and last values are held. The ease of a keyframe shapes the way into it,
 * so it is written on the stop before it.
 */
function planChannel(layer: Layer, channel: Channel): ChannelPlan | null {
  const defining = layer.keyframes.filter((keyframe) =>
    channel.properties.some((property) => keyframe.values[property] !== undefined),
  )
  if (defining.length === 0) return null

  const progresses = [...new Set([0, ...defining.map((keyframe) => keyframe.progress), 1])].sort(
    (a, b) => a - b,
  )
  const stops = progresses.map((progress, index): Stop => {
    const next = defining.find((keyframe) => keyframe.progress === progresses[index + 1])
    const timing = next ? easeToCss(next.ease) : undefined
    return {
      progress,
      value: channel.format(interpolateLayer(layer, progress)),
      timing: timing === 'linear' ? undefined : timing,
    }
  })
  const finalValue = stops[stops.length - 1]?.value ?? ''
  return { channel, stops, isStatic: stops.every((stop) => stop.value === finalValue), finalValue }
}

function planLayer(layer: Layer): ChannelPlan[] {
  return CHANNELS.flatMap((channel) => planChannel(layer, channel) ?? [])
}

function percentOf(progress: number): string {
  return `${formatNumber(progress * 100)}%`
}

function indent(text: string, level: number): string {
  const pad = '  '.repeat(level)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

function rule(selector: string, declarations: readonly string[]): string {
  return `${selector} {\n${declarations.map((line) => `  ${line}`).join('\n')}\n}`
}

function keyframesName(slug: string, channel: Channel): string {
  return `scene-${slug}-${channel.id}`
}

function keyframesRule(slug: string, plan: ChannelPlan): string {
  const blocks = plan.stops.map((stop) => {
    const lines = [`${plan.channel.css}: ${stop.value};`]
    if (stop.timing) lines.push(`animation-timing-function: ${stop.timing};`)
    return indent(rule(percentOf(stop.progress), lines), 1)
  })
  return `@keyframes ${keyframesName(slug, plan.channel)} {\n${blocks.join('\n')}\n}`
}

function styleDeclarations(layer: Layer): string[] {
  const { color, fontSize, radius } = layer.style
  switch (layer.type) {
    case 'rect':
      return [`background: ${safeCssColor(color)};`, `border-radius: ${toStageUnits(radius)};`]
    case 'text':
      return [
        `color: ${safeCssColor(color)};`,
        `font-size: ${toStageUnits(fontSize)};`,
        'display: flex;',
        'align-items: center;',
        'justify-content: center;',
        'text-align: center;',
        'white-space: pre-wrap;',
      ]
    case 'image':
      return [`border-radius: ${toStageUnits(radius)};`, 'object-fit: cover;']
  }
}

/** The layer as it looks without animation: its box, its style and its final values. */
function layerRule(layer: Layer, slug: string, plans: readonly ChannelPlan[]): string {
  const { x, y, width, height } = layer.base
  const finals = plans
    .filter((plan) => plan.finalValue !== plan.channel.format(DEFAULT_VALUES))
    .map((plan) => `${plan.channel.css}: ${plan.finalValue};`)
  return rule(`.scene__layer--${slug}`, [
    `left: ${formatNumber(x)}%;`,
    `top: ${formatNumber(y)}%;`,
    `width: ${formatNumber(width)}%;`,
    `height: ${formatNumber(height)}%;`,
    ...styleDeclarations(layer),
    ...finals,
  ])
}

function animationRule(slug: string, animated: readonly ChannelPlan[]): string {
  const list = animated
    .map((plan) => `${keyframesName(slug, plan.channel)} 1ms linear both`)
    .join(', ')
  return rule(`.scene__layer--${slug}`, [
    `animation: ${list};`,
    'animation-timeline: --scene;',
    'animation-range: contain 0% contain 100%;',
  ])
}

/**
 * Native CSS scroll-driven animation for the project, with no dependencies.
 *
 * Without animation support, and with reduced motion, the layers show their
 * final state. Where `animation-timeline` is supported, a tall `.scene` holds
 * a sticky stage and its view timeline drives every layer from the moment the
 * scene reaches the top of the viewport until its end reaches the bottom.
 * Each animated CSS property gets its own @keyframes, which keeps every
 * keyframe's ease exact for the properties it belongs to.
 */
export function generateCss(project: Project): string {
  const slugs = layerSlugs(project.layers)
  const { width, height } = project.aspectRatio
  const ratio = formatNumber(width / height)

  const base = [
    rule('.scene', ['position: relative;']),
    rule('.scene__stage', ['display: grid;', 'place-items: center;', 'height: 100vh;']),
    rule('.scene__frame', [
      'position: relative;',
      `width: min(100vw, calc(100vh * ${ratio}));`,
      `aspect-ratio: ${formatNumber(width)} / ${formatNumber(height)};`,
      'overflow: hidden;',
      'container-type: inline-size;',
    ]),
    rule('.scene__layer', ['position: absolute;']),
  ]
  const animationRules: string[] = []

  for (const layer of project.layers) {
    const slug = slugs.get(layer.id) ?? layer.id
    const plans = planLayer(layer)
    base.push(layerRule(layer, slug, plans))
    const animated = plans.filter((plan) => !plan.isStatic)
    if (animated.length > 0) {
      animationRules.push(animationRule(slug, animated))
      animated.forEach((plan) => animationRules.push(keyframesRule(slug, plan)))
    }
  }

  const supported = [
    rule('.scene', [
      `height: ${formatNumber(project.sceneLength * 100)}vh;`,
      'view-timeline: --scene block;',
    ]),
    rule('.scene__stage', ['position: sticky;', 'top: 0;']),
    ...animationRules,
  ].join('\n\n')

  const reducedMotion = [
    rule('.scene', ['height: auto;']),
    rule('.scene__stage', ['position: static;']),
    rule('.scene__layer', ['animation: none;']),
  ].join('\n\n')

  return [
    ...base,
    `@supports (animation-timeline: view()) {\n${indent(supported, 1)}\n}`,
    `@media (prefers-reduced-motion: reduce) {\n${indent(reducedMotion, 1)}\n}`,
  ]
    .join('\n\n')
    .concat('\n')
}

function layerMarkup(layer: Layer, slug: string): string {
  const classes = `scene__layer scene__layer--${slug}`
  switch (layer.type) {
    case 'rect':
      return `<div class="${classes}" aria-hidden="true"></div>`
    case 'text':
      return `<div class="${classes}">${escapeHtml(layer.style.text)}</div>`
    case 'image':
      return layer.style.src === ''
        ? `<div class="${classes}" role="img" aria-label="${escapeHtml(layer.name)}"></div>`
        : `<img class="${classes}" src="${escapeHtml(layer.style.src)}" alt="${escapeHtml(layer.name)}">`
  }
}

/** The HTML that the generated CSS styles. Layers are listed bottom to top. */
export function generateMarkup(project: Project): string {
  const slugs = layerSlugs(project.layers)
  const layers = project.layers.map((layer) =>
    indent(layerMarkup(layer, slugs.get(layer.id) ?? layer.id), 3),
  )
  return [
    '<div class="scene">',
    '  <div class="scene__stage">',
    '    <div class="scene__frame">',
    ...layers,
    '    </div>',
    '  </div>',
    '</div>',
    '',
  ].join('\n')
}
