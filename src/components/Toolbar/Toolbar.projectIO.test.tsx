import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { createLayer, createProject } from '../../engine/document'
import { readShareHash, serializeProject } from '../../engine/serialize'
import type { Project } from '../../engine/types'
import { createInitialData, selectProject, useEditorStore } from '../../store/editorStore'
import { Toolbar } from './Toolbar'

function current(): Project {
  return selectProject(useEditorStore.getState())
}

function notice(): string | null {
  return useEditorStore.getState().notice
}

function setClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

function renderToolbar() {
  const view = render(<Toolbar theme="light" onToggleTheme={() => undefined} />)
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input missing')
  return { ...view, input }
}

function pick(input: HTMLInputElement, file: File): void {
  fireEvent.change(input, { target: { files: [file] } })
}

const incoming: Project = {
  ...createProject(),
  name: 'Imported',
  layers: [createLayer('z', 'text', 'Title')],
}

beforeEach(() => {
  useEditorStore.setState(createInitialData())
  useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  vi.restoreAllMocks()
})

describe('Toolbar import', () => {
  it('opens the file picker when Import is pressed', async () => {
    const { input } = renderToolbar()
    const click = vi.spyOn(input, 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Import' }))
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('only offers JSON files', () => {
    const { input } = renderToolbar()
    expect(input).toHaveAttribute('accept', '.json,application/json')
  })

  it('replaces the project with the file and says so', async () => {
    const { input } = renderToolbar()
    pick(
      input,
      new File([serializeProject(incoming)], 'project.json', { type: 'application/json' }),
    )
    await waitFor(() => {
      expect(current()).toEqual(incoming)
    })
    expect(notice()).toBe('Imported project.json. Undo brings your previous project back.')
  })

  it('can be undone, which brings the previous project back', async () => {
    const before = current()
    const { input } = renderToolbar()
    pick(input, new File([serializeProject(incoming)], 'project.json'))
    await waitFor(() => {
      expect(current().name).toBe('Imported')
    })
    useEditorStore.getState().undo()
    expect(current()).toBe(before)
  })

  it('upgrades a file from an older version', async () => {
    const legacy = JSON.stringify({ version: 0, name: 'Old', sceneLength: 2, layers: [] })
    const { input } = renderToolbar()
    pick(input, new File([legacy], 'old.json'))
    await waitFor(() => {
      expect(current().name).toBe('Old')
    })
    expect(current().aspectRatio).toEqual({ width: 16, height: 9 })
  })

  it('keeps the current project and explains when the file is not JSON', async () => {
    const before = current()
    const { input } = renderToolbar()
    pick(input, new File(['{ nope'], 'bad.json'))
    await waitFor(() => {
      expect(notice()).toBe('Could not import bad.json: The file is not valid JSON.')
    })
    expect(current()).toBe(before)
  })

  it('keeps the current project and names the problem when the project is not valid', async () => {
    const before = current()
    const { input } = renderToolbar()
    pick(input, new File([JSON.stringify({ ...incoming, sceneLength: 0 })], 'wrong.json'))
    await waitFor(() => {
      expect(notice()).toContain('Could not import wrong.json: The project is not valid')
    })
    expect(notice()).toContain('project.sceneLength: must be greater than 0')
    expect(current()).toBe(before)
  })

  it('refuses a file over the size limit without reading it', async () => {
    const file = new File(['{}'], 'huge.json')
    Object.defineProperty(file, 'size', { value: 5_000_001 })
    const { input } = renderToolbar()
    pick(input, file)
    await waitFor(() => {
      expect(notice()).toBe('Could not import huge.json: the file is too large.')
    })
  })

  it('does nothing when the picker is closed without a file', () => {
    const before = current()
    const { input } = renderToolbar()
    fireEvent.change(input, { target: { files: [] } })
    expect(current()).toBe(before)
    expect(notice()).toBeNull()
  })
})

describe('Toolbar share', () => {
  it('copies a link that opens the same project', async () => {
    const copied: string[] = []
    setClipboard((text) => {
      copied.push(text)
      return Promise.resolve()
    })
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => {
      expect(notice()).toBe('Share link copied to the clipboard.')
    })
    expect(copied).toHaveLength(1)
    const link = new URL(copied[0] ?? '')
    expect(link.origin + link.pathname).toBe(window.location.origin + window.location.pathname)
    expect(link.hash.startsWith('#share=1.')).toBe(true)
    expect(await readShareHash(link.hash)).toEqual({ ok: true, project: current() })
  })

  it('puts the link in the address bar when the browser will not copy it', async () => {
    setClipboard(() => Promise.reject(new Error('denied')))
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => {
      expect(notice()).toBe(
        'The link could not be copied automatically. It is now in the address bar.',
      )
    })
    expect(window.location.hash.startsWith('#share=1.')).toBe(true)
  })

  it('says so, and copies nothing, when the project is too large for a link', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    setClipboard(writeText)
    let seed = 7
    let text = ''
    for (let index = 0; index < 20000; index++) {
      seed = (seed * 1103515245 + 12345) % 2147483648
      text += String.fromCharCode(48 + (seed % 70))
    }
    const layer = createLayer('t', 'text', 'Big')
    useEditorStore
      .getState()
      .replaceProject({
        ...createProject(),
        layers: [{ ...layer, style: { ...layer.style, text } }],
      })
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => {
      expect(notice()).toContain('too large for a share link')
    })
    expect(writeText).not.toHaveBeenCalled()
  })
})
