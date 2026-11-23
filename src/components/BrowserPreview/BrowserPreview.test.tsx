import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createLayer, createProject } from '../../engine/document'
import { generateHtml } from '../../engine/codegen/html'
import { createInitialData, useEditorStore } from '../../store/editorStore'
import { BrowserPreview } from './BrowserPreview'

function stubSupport(supported: boolean): void {
  vi.stubGlobal('CSS', { supports: () => supported })
}

function frame(): HTMLIFrameElement {
  return screen.getByTitle<HTMLIFrameElement>('Browser preview of the exported CSS')
}

beforeEach(() => {
  useEditorStore.setState(
    createInitialData({
      ...createProject(),
      name: 'Demo',
      layers: [createLayer('a', 'rect', 'Box')],
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BrowserPreview', () => {
  it('runs the exported single-file HTML in the frame', () => {
    stubSupport(true)
    render(<BrowserPreview />)
    const project = useEditorStore.getState().history.present
    expect(frame().getAttribute('srcdoc')).toBe(generateHtml(project))
    expect(frame().getAttribute('srcdoc')).toContain('@supports (animation-timeline: view())')
  })

  it('sandboxes the frame without any permission, so the page cannot run scripts', () => {
    stubSupport(true)
    render(<BrowserPreview />)
    expect(frame().getAttribute('sandbox')).toBe('')
  })

  it('follows edits to the project', () => {
    stubSupport(true)
    render(<BrowserPreview />)
    expect(frame().getAttribute('srcdoc')).not.toContain('scene__layer--zebra')
    act(() => {
      useEditorStore.getState().addLayer(createLayer('z', 'rect', 'Zebra'))
    })
    expect(frame().getAttribute('srcdoc')).toContain('scene__layer--zebra')
  })

  it('shows no message when scroll-driven animations are supported', () => {
    stubSupport(true)
    render(<BrowserPreview />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('explains clearly when scroll-driven animations are not supported, and still shows the frame', () => {
    stubSupport(false)
    render(<BrowserPreview />)
    const message = screen.getByRole('status')
    expect(message).toHaveTextContent('does not support CSS scroll-driven animations')
    expect(message).toHaveTextContent('final layout')
    expect(frame()).toBeInTheDocument()
  })

  it('explains the same when the browser has no CSS.supports at all', () => {
    vi.stubGlobal('CSS', undefined)
    render(<BrowserPreview />)
    expect(screen.getByRole('status')).toHaveTextContent('does not support')
  })
})
