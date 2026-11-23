import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { createLayer, createProject } from '../../engine/document'
import { downloadText } from '../../lib/download'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { ExportDialog } from './ExportDialog'

vi.mock('../../lib/download', () => ({ downloadText: vi.fn() }))

function setClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

function setup(onClose: () => void = () => undefined) {
  useEditorStore.setState(
    createInitialData({
      ...createProject(),
      name: 'Demo',
      layers: [createLayer('z', 'rect', 'Zebra')],
    }),
  )
  const user = userEvent.setup()
  const view = render(<ExportDialog onClose={onClose} />)
  return { user, ...view }
}

function panelText(): string {
  return screen.getByRole('tabpanel').textContent
}

afterEach(() => {
  vi.mocked(downloadText).mockClear()
})

describe('ExportDialog layout', () => {
  it('is a modal dialog named Export with four tabs, CSS first and selected', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Export' })).toHaveAttribute('aria-modal', 'true')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'CSS',
      'Motion React (TSX)',
      'Single-file HTML',
      'Project JSON',
    ])
    expect(screen.getByRole('tab', { name: 'CSS' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the markup and the CSS of the current project on the CSS tab', () => {
    setup()
    expect(panelText()).toContain('class="scene"')
    expect(panelText()).toContain('scene__layer--zebra')
    expect(panelText()).toContain('@supports (animation-timeline: view())')
    expect(panelText()).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('shows the Motion component and the package to install on the Motion tab', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Motion React (TSX)' }))
    expect(panelText()).toContain('from "motion/react"')
    expect(panelText()).toContain('export function ScrollScene()')
    expect(panelText()).toContain('npm install motion')
    expect(screen.getByRole('tab', { name: 'Motion React (TSX)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows a full page on the single-file HTML tab', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Single-file HTML' }))
    expect(panelText()).toContain('<!doctype html>')
    expect(panelText()).toContain('<title>Demo</title>')
  })

  it('shows the project on the JSON tab', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Project JSON' }))
    expect(panelText()).toContain('"sceneLength": 4')
    expect(panelText()).toContain('"name": "Zebra"')
  })

  it('links the panel to the selected tab', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Project JSON' }))
    const tab = screen.getByRole('tab', { name: 'Project JSON' })
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tab.id)
    expect(tab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id)
  })
})

describe('ExportDialog tab keys', () => {
  it('starts with focus on the selected tab', () => {
    setup()
    expect(screen.getByRole('tab', { name: 'CSS' })).toHaveFocus()
  })

  it('arrow keys move to the next and previous tab and wrap around', async () => {
    const { user } = setup()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Motion React (TSX)' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Motion React (TSX)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Project JSON' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'CSS' })).toHaveFocus()
  })

  it('Home and End jump to the first and last tab', async () => {
    const { user } = setup()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Project JSON' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'CSS' })).toHaveFocus()
  })

  it('only the selected tab is in the tab order', () => {
    setup()
    expect(screen.getByRole('tab', { name: 'CSS' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Project JSON' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('ExportDialog copy and download', () => {
  it('copies the exact file content and says so', async () => {
    const copied: string[] = []
    const { user } = setup()
    setClipboard((text) => {
      copied.push(text)
      return Promise.resolve()
    })
    await user.click(screen.getByRole('button', { name: 'Copy scene.css' }))
    expect(copied).toHaveLength(1)
    expect(copied[0]).toContain('@supports (animation-timeline: view())')
    expect(copied[0]).not.toContain('class="scene"')
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  it('says so when the copy fails', async () => {
    const { user } = setup()
    setClipboard(() => Promise.reject(new Error('denied')))
    await user.click(screen.getByRole('button', { name: 'Copy scene.html' }))
    expect(await screen.findByText('Copy failed')).toBeInTheDocument()
  })

  it('downloads a file under its own name and type', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Download scene.css' }))
    expect(downloadText).toHaveBeenCalledTimes(1)
    const call = vi.mocked(downloadText).mock.calls[0]
    expect(call?.[0]).toBe('scene.css')
    expect(call?.[2]).toBe('text/css')
    expect(call?.[1]).toContain('@supports (animation-timeline: view())')
  })

  it('downloads the JSON with the right type', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Project JSON' }))
    await user.click(screen.getByRole('button', { name: 'Download project.json' }))
    const call = vi.mocked(downloadText).mock.calls[0]
    expect(call?.[0]).toBe('project.json')
    expect(call?.[2]).toBe('application/json')
  })

  it('has its own copy and download buttons for every file on the CSS tab', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Copy scene.html' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy scene.css' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download scene.html' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download scene.css' })).toBeInTheDocument()
  })

  it('forgets the copy message when another tab is opened', async () => {
    const { user } = setup()
    setClipboard(() => Promise.resolve())
    await user.click(screen.getByRole('button', { name: 'Copy scene.css' }))
    expect(await screen.findByText('Copied')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Project JSON' }))
    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
  })
})

describe('ExportDialog closing', () => {
  it('closes on Escape', async () => {
    const onClose = vi.fn()
    const { user } = setup(onClose)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with the Close button', async () => {
    const onClose = vi.fn()
    const { user } = setup(onClose)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is pressed, but not when the dialog itself is', () => {
    const onClose = vi.fn()
    setup(onClose)
    const dialog = screen.getByRole('dialog')
    fireEvent.mouseDown(dialog)
    expect(onClose).not.toHaveBeenCalled()
    if (!dialog.parentElement) throw new Error('backdrop missing')
    fireEvent.mouseDown(dialog.parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab inside: from the last control it wraps to the first, and back with Shift+Tab', async () => {
    const { user } = setup()
    const downloads = screen.getAllByRole('button', { name: /^Download / })
    downloads[downloads.length - 1]?.focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(downloads[downloads.length - 1]).toHaveFocus()
  })

  it('gives focus back to the element that had it before the dialog opened', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = setup()
    expect(opener).not.toHaveFocus()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
