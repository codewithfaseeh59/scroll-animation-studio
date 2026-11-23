import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AppShell } from './components/AppShell/AppShell'
import { createLayer, createProject } from './engine/document'
import type { Layer } from './engine/types'
import { createInitialData, useEditorStore } from './store/editorStore'
import { TEMPLATES } from './templates'
import { instantiateProject } from './templates/instantiate'

const CONTROLS =
  'button, input:not([type="hidden"]), select, textarea, a[href], [role="slider"], [role="tab"], [role="button"], [role="img"]'

/** A simple version of how a screen reader finds the name of a control. */
function accessibleName(element: Element): string {
  const label = element.getAttribute('aria-label')?.trim()
  if (label) return label
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
  }
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const fromLabels = [...(element.labels ?? [])]
      .map((item) => item.textContent)
      .join(' ')
      .trim()
    if (fromLabels) return fromLabels
  }
  return element.textContent.trim() || element.getAttribute('title')?.trim() || ''
}

function unnamedControls(): string[] {
  return [...document.querySelectorAll(CONTROLS)]
    .filter((element) => accessibleName(element) === '')
    .map((element) => element.outerHTML.slice(0, 120))
}

function loadDemoProject(): Layer[] {
  const template = TEMPLATES[0]
  if (!template) throw new Error('no templates')
  const fresh = instantiateProject(template.project)
  const photo: Layer = {
    ...createLayer('photo', 'image', 'Photo'),
    style: { ...createLayer('photo', 'image', 'Photo').style, src: '/photo.png' },
  }
  useEditorStore.setState(
    createInitialData({
      ...fresh,
      layers: [...fresh.layers, createLayer('box', 'rect', 'Box'), photo],
    }),
  )
  return useEditorStore.getState().history.present.layers
}

function select(layerName: string): void {
  const layer = useEditorStore
    .getState()
    .history.present.layers.find((item) => item.name === layerName)
  if (!layer) throw new Error(`no layer named ${layerName}`)
  act(() => {
    useEditorStore.getState().select(layer.id)
  })
}

beforeEach(() => {
  loadDemoProject()
})

describe('names', () => {
  it('every control in the editor has an accessible name', () => {
    render(<AppShell />)
    expect(document.querySelectorAll(CONTROLS).length).toBeGreaterThan(20)
    expect(unnamedControls()).toEqual([])
  })

  it('every control has a name for each type of layer and for a selected keyframe', () => {
    render(<AppShell />)
    const layers = useEditorStore.getState().history.present.layers
    for (const layer of layers) {
      select(layer.name)
      expect(unnamedControls()).toEqual([])
    }
    const titled = layers.find((layer) => layer.keyframes.length > 0)
    if (!titled) throw new Error('no animated layer')
    const keyframe = titled.keyframes[0]
    if (!keyframe) throw new Error('no keyframe')
    act(() => {
      useEditorStore.getState().selectKeyframe(titled.id, keyframe.id)
    })
    expect(screen.getByLabelText('Easing')).toBeInTheDocument()
    expect(unnamedControls()).toEqual([])
  })

  it.each([
    ['Export', 'Export'],
    ['New project', 'New project'],
    ['Shortcuts', 'Keyboard shortcuts'],
  ])(
    'every control in the %s dialog has a name, and the dialog is named',
    async (button, title) => {
      render(<AppShell />)
      await userEvent.click(screen.getByRole('button', { name: button }))
      expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument()
      expect(unnamedControls()).toEqual([])
    },
  )

  it('the export dialog has names on every tab', async () => {
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    for (const tab of screen.getAllByRole('tab')) {
      await userEvent.click(tab)
      expect(unnamedControls()).toEqual([])
    }
  })

  it('the browser preview frame has a title', async () => {
    vi.stubGlobal('CSS', { supports: () => true })
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Browser preview' }))
    expect(screen.getByTitle('Browser preview of the exported CSS')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('every image has alternative text', () => {
    const { container } = render(<AppShell />)
    const images = [...container.querySelectorAll('img')]
    expect(images.length).toBeGreaterThan(0)
    for (const image of images) expect(image.getAttribute('alt')).toBeTruthy()
  })

  it('the page has its landmarks: banner, main, two sidebars and a labelled timeline', () => {
    render(<AppShell />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Stage' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Layers' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeInTheDocument()
  })

  it('the page has one level 1 heading', () => {
    render(<AppShell />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('the document language is declared', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<html lang="en">')
  })
})

describe('keyboard', () => {
  async function tabThroughEverything(): Promise<string[]> {
    const names: string[] = []
    for (let step = 0; step < 300; step++) {
      await userEvent.tab()
      const active = document.activeElement
      if (!active || active === document.body) break
      const name = accessibleName(active)
      if (names[0] === name && names.length > 1) break
      names.push(name)
    }
    return names
  }

  it('Tab reaches the toolbar, the layer list, its delete buttons, the inspector and the timeline', async () => {
    render(<AppShell />)
    select('Title')
    const names = await tabThroughEverything()
    const expected = [
      'New project',
      'Play preview',
      'Browser preview',
      'Import',
      'Share',
      'Export',
      'Shortcuts',
      'Add rectangle',
      'Delete Title',
      'Delete Box',
      'Name',
      'Playhead',
    ]
    for (const name of expected) expect(names).toContain(name)
    expect(names.some((name) => name.startsWith('Title: keyframe at'))).toBe(true)
    expect(names.some((name) => name.startsWith('Subtitle: keyframe at'))).toBe(true)
  })

  it('Tab goes through every layer in the list and every layer on the timeline', async () => {
    render(<AppShell />)
    const names = await tabThroughEverything()
    for (const layer of ['Background', 'Title', 'Subtitle', 'Box', 'Photo']) {
      expect(names.some((name) => name.startsWith(layer) && name !== `Delete ${layer}`)).toBe(true)
      expect(names).toContain(`Delete ${layer}`)
    }
  })

  it('the controls are in a sensible order: toolbar, then layers, then inspector, then timeline', async () => {
    render(<AppShell />)
    select('Title')
    const names = await tabThroughEverything()
    const at = (name: string): number => names.indexOf(name)
    expect(at('New project')).toBeLessThan(at('Add rectangle'))
    expect(at('Add rectangle')).toBeLessThan(at('Name'))
    expect(at('Name')).toBeLessThan(at('Playhead'))
  })

  it('each control gets the keyboard focus it is given', async () => {
    render(<AppShell />)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'New project' })).toHaveFocus()
  })
})

describe('colour is not the only cue', () => {
  it('a selected layer is marked for assistive technology in the list and on the timeline', () => {
    render(<AppShell />)
    select('Title')
    const pressed = screen
      .getAllByRole('button', { pressed: true })
      .map((button) => accessibleName(button))
    expect(pressed.some((name) => name.startsWith('Title'))).toBe(true)
    expect(screen.getByRole('button', { name: 'Browser preview' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('the browser preview button says whether it is on', async () => {
    vi.stubGlobal('CSS', { supports: () => true })
    render(<AppShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Browser preview' }))
    expect(screen.getByRole('button', { name: 'Browser preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    vi.unstubAllGlobals()
  })

  it('an empty project explains itself in words', () => {
    useEditorStore.setState(createInitialData(createProject()))
    render(<AppShell />)
    expect(screen.getByText('No layers yet. Add one above.')).toBeInTheDocument()
    expect(screen.getByText('Select a layer to edit its properties.')).toBeInTheDocument()
    expect(screen.getByText('Add a layer to start animating.')).toBeInTheDocument()
  })

  it('results are announced in text in a live region', () => {
    render(<AppShell />)
    act(() => {
      useEditorStore.getState().setNotice('Imported project.json.')
    })
    const live = screen
      .getAllByRole('status')
      .find((item) => item.textContent.includes('Imported'))
    expect(live).toBeDefined()
  })
})

describe('focus is visible', () => {
  const stylesheets: Record<string, string> = Object.fromEntries(
    readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.css'))
      .map((file) => [file, readFileSync(join('src', file), 'utf8').replaceAll('\r\n', '\n')]),
  )

  /** The declarations of the first rule with this selector, or an empty string. */
  function ruleBody(css: string, selector: string): string {
    const start = css.indexOf(`${selector} {`)
    if (start === -1) return ''
    return css.slice(start, css.indexOf('}', start))
  }

  it('finds the stylesheets', () => {
    expect(Object.keys(stylesheets).length).toBeGreaterThan(10)
  })

  it('no stylesheet removes the focus outline', () => {
    for (const [file, css] of Object.entries(stylesheets)) {
      expect(css, file).not.toMatch(/outline\s*:\s*(none|0)\b/)
      expect(css, file).not.toMatch(/outline-style\s*:\s*none/)
    }
  })

  it('every focused control gets an outline from the global stylesheet', () => {
    const global = Object.entries(stylesheets).find(([file]) => file.endsWith('global.css'))?.[1]
    expect(global).toBeDefined()
    expect(ruleBody(global ?? '', ':focus-visible')).toContain('outline: 2px solid')
  })

  it.each([
    ['LayerList.module.css', ".item[aria-pressed='true']"],
    ['Timeline.module.css', ".label[aria-pressed='true']"],
    ['Timeline.module.css', '.track[data-selected]'],
    ['Timeline.module.css', '.diamond[data-selected]'],
    ['Toolbar.module.css', ".button[aria-pressed='true']"],
  ])('%s: %s has a cue other than colour', (file, selector) => {
    const css = Object.entries(stylesheets).find(([name]) => name.endsWith(file))?.[1] ?? ''
    const body = ruleBody(css, selector)
    expect(body).not.toBe('')
    expect(body).toMatch(/box-shadow|font-weight|text-decoration|outline/)
  })
})
