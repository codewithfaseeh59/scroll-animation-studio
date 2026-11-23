import type { Layer } from '../types'
import { camelCase, escapeHtml, formatNumber, indent, layerSlugs, safeCssColor } from './shared'

function named(id: string, name: string): Layer {
  return {
    id,
    name,
    type: 'rect',
    base: { x: 0, y: 0, width: 10, height: 10 },
    style: { color: '#000000', text: '', fontSize: 16, src: '', radius: 0 },
    keyframes: [],
  }
}

function slugOf(name: string): string | undefined {
  return layerSlugs([named('a', name)]).get('a')
}

describe('formatNumber', () => {
  it('keeps whole numbers and short decimals as they are', () => {
    expect(formatNumber(50)).toBe('50')
    expect(formatNumber(4.8)).toBe('4.8')
  })

  it('rounds to 4 decimals: 33.33333333 becomes 33.3333', () => {
    expect(formatNumber(33.33333333)).toBe('33.3333')
  })

  it('removes floating point noise: 0.1 + 0.2 becomes 0.3', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })

  it('never writes -0', () => {
    expect(formatNumber(-0.00001)).toBe('0')
    expect(formatNumber(-0)).toBe('0')
  })

  it('keeps negative numbers', () => {
    expect(formatNumber(-12.5)).toBe('-12.5')
  })
})

describe('safeCssColor', () => {
  it('allows hex colours and colour names', () => {
    expect(safeCssColor('#ff0000')).toBe('#ff0000')
    expect(safeCssColor('#F80')).toBe('#F80')
    expect(safeCssColor('rebeccapurple')).toBe('rebeccapurple')
  })

  it('replaces anything that could carry extra CSS with black', () => {
    expect(safeCssColor('red; } body { display: none')).toBe('#000000')
    expect(safeCssColor('url(javascript:alert(1))')).toBe('#000000')
    expect(safeCssColor('')).toBe('#000000')
  })
})

describe('escapeHtml', () => {
  it('escapes the characters that matter in markup and attributes', () => {
    expect(escapeHtml('<b class="x">Tom & Jerry</b>')).toBe(
      '&lt;b class=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/b&gt;',
    )
  })
})

describe('indent', () => {
  it('indents every non-empty line by two spaces per level', () => {
    expect(indent('a\n\nb', 2)).toBe('    a\n\n    b')
  })

  it('level 0 changes nothing', () => {
    expect(indent('a\nb', 0)).toBe('a\nb')
  })
})

describe('camelCase', () => {
  it('joins hyphenated words: hero-title becomes heroTitle', () => {
    expect(camelCase('hero-title')).toBe('heroTitle')
  })

  it('keeps digits and handles several hyphens: box-2-2 becomes box22', () => {
    expect(camelCase('box-2-2')).toBe('box22')
  })

  it('leaves a single word alone', () => {
    expect(camelCase('box')).toBe('box')
  })
})

describe('layerSlugs', () => {
  it('makes a lowercase hyphenated name: "Hero title" becomes hero-title', () => {
    expect(slugOf('Hero title')).toBe('hero-title')
  })

  it('drops punctuation and trims hyphens: "Hello, World!" becomes hello-world', () => {
    expect(slugOf('Hello, World!')).toBe('hello-world')
  })

  it('does not start with a digit: "123" becomes layer-123', () => {
    expect(slugOf('123')).toBe('layer-123')
  })

  it('falls back to "layer" when nothing usable is left', () => {
    expect(slugOf('')).toBe('layer')
    expect(slugOf('!!!')).toBe('layer')
  })

  it('makes every slug different: Box, Box, Box 2 become box, box-2, box-2-2', () => {
    const slugs = layerSlugs([named('a', 'Box'), named('b', 'Box'), named('c', 'Box 2')])
    expect([slugs.get('a'), slugs.get('b'), slugs.get('c')]).toEqual(['box', 'box-2', 'box-2-2'])
  })
})
