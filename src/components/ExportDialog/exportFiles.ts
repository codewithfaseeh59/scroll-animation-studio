import { generateCss, generateMarkup } from '../../engine/codegen/css'
import { generateHtml } from '../../engine/codegen/html'
import { generateMotionReact } from '../../engine/codegen/motionReact'
import { serializeProject } from '../../engine/serialize'
import type { Project } from '../../engine/types'

export interface ExportFile {
  /** The name a download is saved under. */
  name: string
  /** What the file is, shown above its code. */
  label: string
  mime: string
  content: string
}

export interface ExportTab {
  id: 'css' | 'motion' | 'html' | 'json'
  label: string
  /** A hint shown above the files, such as what to install. */
  note?: string
  files: ExportFile[]
}

/** Everything the export dialog offers for a project, one entry per tab. */
export function buildExportTabs(project: Project): ExportTab[] {
  return [
    {
      id: 'css',
      label: 'CSS',
      note: 'Native CSS scroll-driven animations. No dependencies.',
      files: [
        {
          name: 'scene.html',
          label: 'Markup',
          mime: 'text/html',
          content: generateMarkup(project),
        },
        { name: 'scene.css', label: 'CSS', mime: 'text/css', content: generateCss(project) },
      ],
    },
    {
      id: 'motion',
      label: 'Motion React (TSX)',
      note: 'Needs the motion package: npm install motion',
      files: [
        {
          name: 'ScrollScene.tsx',
          label: 'React component',
          mime: 'text/plain',
          content: generateMotionReact(project),
        },
      ],
    },
    {
      id: 'html',
      label: 'Single-file HTML',
      note: 'One page with the CSS inline. Save it and open it in a browser.',
      files: [
        {
          name: 'index.html',
          label: 'HTML page',
          mime: 'text/html',
          content: generateHtml(project),
        },
      ],
    },
    {
      id: 'json',
      label: 'Project JSON',
      note: 'The project itself, to keep or share.',
      files: [
        {
          name: 'project.json',
          label: 'Project',
          mime: 'application/json',
          content: serializeProject(project),
        },
      ],
    },
  ]
}
