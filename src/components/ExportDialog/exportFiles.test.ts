import { createLayer, createProject } from '../../engine/document'
import { generateCss, generateMarkup } from '../../engine/codegen/css'
import { generateHtml } from '../../engine/codegen/html'
import { generateMotionReact } from '../../engine/codegen/motionReact'
import { validateProject } from '../../engine/validate'
import { buildExportTabs } from './exportFiles'

const project = {
  ...createProject(),
  name: 'Demo',
  layers: [createLayer('a', 'rect', 'Box'), createLayer('b', 'text', 'Title')],
}

describe('buildExportTabs', () => {
  it('offers CSS, Motion React, single-file HTML and project JSON in that order', () => {
    const tabs = buildExportTabs(project)
    expect(tabs.map((tab) => tab.id)).toEqual(['css', 'motion', 'html', 'json'])
    expect(tabs.map((tab) => tab.label)).toEqual([
      'CSS',
      'Motion React (TSX)',
      'Single-file HTML',
      'Project JSON',
    ])
  })

  it('the CSS tab has the markup and the CSS as two files', () => {
    const files = buildExportTabs(project)[0]?.files
    expect(files?.map((file) => file.name)).toEqual(['scene.html', 'scene.css'])
    expect(files?.[0]?.content).toBe(generateMarkup(project))
    expect(files?.[1]?.content).toBe(generateCss(project))
    expect(files?.map((file) => file.mime)).toEqual(['text/html', 'text/css'])
  })

  it('the Motion tab has the component and says which package to install', () => {
    const tab = buildExportTabs(project)[1]
    expect(tab?.files).toHaveLength(1)
    expect(tab?.files[0]?.name).toBe('ScrollScene.tsx')
    expect(tab?.files[0]?.content).toBe(generateMotionReact(project))
    expect(tab?.note).toContain('npm install motion')
  })

  it('the HTML tab has one page', () => {
    const files = buildExportTabs(project)[2]?.files
    expect(files).toHaveLength(1)
    expect(files?.[0]?.name).toBe('index.html')
    expect(files?.[0]?.content).toBe(generateHtml(project))
  })

  it('the JSON tab holds the project, readable back into the same project', () => {
    const file = buildExportTabs(project)[3]?.files[0]
    expect(file?.name).toBe('project.json')
    expect(file?.mime).toBe('application/json')
    const parsed: unknown = JSON.parse(file?.content ?? '')
    expect(parsed).toEqual(project)
    expect(validateProject(parsed).ok).toBe(true)
  })

  it('JSON is indented with two spaces and ends with a newline', () => {
    const content = buildExportTabs(project)[3]?.files[0]?.content ?? ''
    expect(content).toContain('\n  "sceneLength": 4,')
    expect(content.endsWith('}\n')).toBe(true)
  })

  it('has a different name for every file in a tab', () => {
    for (const tab of buildExportTabs(project)) {
      const names = tab.files.map((file) => file.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})
