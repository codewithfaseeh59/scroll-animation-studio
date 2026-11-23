import type { Project } from '../types'
import { generateCss, generateMarkup } from './css'
import { escapeHtml, indent } from './shared'

/**
 * A complete HTML page with the CSS inline and no dependencies: save it as a
 * file and open it in a browser.
 */
export function generateHtml(project: Project): string {
  const title = project.name === '' ? 'Scroll animation' : project.name
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${escapeHtml(title)}</title>`,
    '    <style>',
    indent('body {\n  margin: 0;\n}\n', 3),
    indent(generateCss(project).trimEnd(), 3),
    '    </style>',
    '  </head>',
    '  <body>',
    indent(generateMarkup(project).trimEnd(), 2),
    '  </body>',
    '</html>',
    '',
  ].join('\n')
}
