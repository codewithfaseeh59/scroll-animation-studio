import type { Layer } from '../types'

/** A number as short CSS text: at most 4 decimals, no trailing zeros, never "-0". */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10000) / 10000
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i
const NAMED_COLOR = /^[a-z]+$/i

/**
 * A colour that is safe to write into CSS: a hex colour or a colour name.
 * Anything else (it could carry extra CSS) is replaced by black.
 */
export function safeCssColor(value: string): string {
  return HEX_COLOR.test(value) || NAMED_COLOR.test(value) ? value : '#000000'
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug === '') return 'layer'
  return /^[a-z]/.test(slug) ? slug : `layer-${slug}`
}

/**
 * A readable name for each layer that is safe in a CSS class or keyframes
 * name and different for every layer: "Hero title" becomes "hero-title", a
 * second "Box" becomes "box-2". Keyed by layer id.
 */
export function layerSlugs(layers: readonly Layer[]): Map<string, string> {
  const slugs = new Map<string, string>()
  const taken = new Set<string>()
  for (const layer of layers) {
    const base = slugify(layer.name)
    let slug = base
    for (let count = 2; taken.has(slug); count++) slug = `${base}-${String(count)}`
    taken.add(slug)
    slugs.set(layer.id, slug)
  }
  return slugs
}
