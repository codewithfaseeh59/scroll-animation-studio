import { createLayer, createProject } from '../document'
import type { Layer, Project } from '../types'
import { generateCss, generateMarkup } from './css'
import { generateHtml } from './html'

function projectWith(layers: Layer[], overrides: Partial<Project> = {}): Project {
  return { ...createProject(), layers, ...overrides }
}

describe('generateHtml', () => {
  it('is a complete page: doctype, language, charset and viewport', () => {
    const html = generateHtml(projectWith([]))
    expect(html.startsWith('<!doctype html>\n<html lang="en">\n')).toBe(true)
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">')
    expect(html.endsWith('</body>\n</html>\n')).toBe(true)
  })

  it('uses the project name as the title', () => {
    expect(generateHtml(projectWith([], { name: 'My scene' }))).toContain('<title>My scene</title>')
  })

  it('falls back to a title when the name is empty', () => {
    expect(generateHtml(projectWith([], { name: '' }))).toContain('<title>Scroll animation</title>')
  })

  it('escapes the title so a name cannot add markup', () => {
    const html = generateHtml(projectWith([], { name: '</title><script>alert(1)</script>' }))
    expect(html).toContain('<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>')
    expect(html).not.toContain('<script>')
  })

  it('contains the generated CSS inside one style element, with the scroll animation parts', () => {
    const html = generateHtml(projectWith([createLayer('r', 'rect', 'Box')]))
    expect(html.match(/<style>/g)).toHaveLength(1)
    expect(html).toContain('@supports (animation-timeline: view()) {')
    expect(html).toContain('@media (prefers-reduced-motion: reduce) {')
    expect(html.indexOf('<style>')).toBeLessThan(html.indexOf('@supports'))
    expect(html.indexOf('@supports')).toBeLessThan(html.indexOf('</style>'))
  })

  it('has every line of the CSS and the markup, only indented', () => {
    const project = projectWith([
      createLayer('r', 'rect', 'Box'),
      createLayer('t', 'text', 'Title'),
    ])
    const html = generateHtml(project)
    const lines = new Set(html.split('\n').map((line) => line.trim()))
    for (const line of [
      ...generateCss(project).split('\n'),
      ...generateMarkup(project).split('\n'),
    ]) {
      if (line.trim() !== '') expect(lines.has(line.trim())).toBe(true)
    }
  })

  it('puts the markup in the body, after the style', () => {
    const html = generateHtml(projectWith([createLayer('r', 'rect', 'Box')]))
    expect(html.indexOf('<body>')).toBeGreaterThan(html.indexOf('</style>'))
    expect(html.indexOf('<div class="scene">')).toBeGreaterThan(html.indexOf('<body>'))
    expect(html.indexOf('scene__layer--box" aria-hidden')).toBeGreaterThan(html.indexOf('<body>'))
  })

  it('resets the body margin so the scene fills the page', () => {
    expect(generateHtml(projectWith([]))).toContain('body {\n        margin: 0;\n      }')
  })

  it('cannot be broken out of by layer names or colours', () => {
    const hostile = '</style><script>alert(1)</script>'
    const layer = createLayer('r', 'rect', hostile)
    const html = generateHtml(
      projectWith([{ ...layer, style: { ...layer.style, color: hostile } }]),
    )
    expect(html).not.toContain('<script>')
    expect(html.match(/<\/style>/g)).toHaveLength(1)
  })
})
