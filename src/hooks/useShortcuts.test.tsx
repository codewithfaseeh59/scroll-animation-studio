import { fireEvent, render } from '@testing-library/react'
import { createLayer, createProject, getLayer } from '../engine/document'
import type { Layer } from '../engine/types'
import { createInitialData, selectProject, useEditorStore } from '../store/editorStore'
import { useShortcuts } from './useShortcuts'

function Harness({ children }: { children?: React.ReactNode }) {
  useShortcuts()
  return <div>{children}</div>
}

function keyframed(id: string): Layer {
  return {
    ...createLayer(id, 'rect', `Box ${id}`),
    keyframes: [
      { id: `${id}-k0`, progress: 0, values: { opacity: 0 }, ease: 'linear' },
      { id: `${id}-k1`, progress: 1, values: { opacity: 1 }, ease: 'linear' },
    ],
  }
}

function load(layers: Layer[], selectedLayerId: string | null = null): void {
  useEditorStore.setState({
    ...createInitialData({ ...createProject(), layers }),
    selectedLayerId,
  })
}

function layers(): Layer[] {
  return selectProject(useEditorStore.getState()).layers
}

function xOf(id: string): number | undefined {
  return getLayer(selectProject(useEditorStore.getState()), id)?.base.x
}

function press(
  key: string,
  options: Partial<{
    target: Element
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    altKey: boolean
    repeat: boolean
    isComposing: boolean
  }> = {},
): boolean {
  const { target = document.body, ...init } = options
  return fireEvent.keyDown(target, { key, ...init })
}

beforeEach(() => {
  document.body.innerHTML = ''
  load([])
})

describe('undo and redo', () => {
  it('Ctrl+Z undoes and Shift+Ctrl+Z redoes', () => {
    render(<Harness />)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    press('z', { ctrlKey: true })
    expect(layers()).toHaveLength(0)
    press('Z', { ctrlKey: true, shiftKey: true })
    expect(layers()).toHaveLength(1)
  })

  it('Cmd+Z undoes and Shift+Cmd+Z redoes', () => {
    render(<Harness />)
    useEditorStore.getState().addLayer(createLayer('a', 'rect', 'Box'))
    press('z', { metaKey: true })
    expect(layers()).toHaveLength(0)
    press('Z', { metaKey: true, shiftKey: true })
    expect(layers()).toHaveLength(1)
  })

  it('keeps the browser from running its own undo', () => {
    render(<Harness />)
    expect(press('z', { ctrlKey: true })).toBe(false)
  })

  it('repeats while the keys are held, like undo does elsewhere', () => {
    render(<Harness />)
    for (const id of ['a', 'b', 'c'])
      useEditorStore.getState().addLayer(createLayer(id, 'rect', id))
    press('z', { ctrlKey: true })
    press('z', { ctrlKey: true, repeat: true })
    expect(layers()).toHaveLength(1)
  })
})

describe('K adds a keyframe', () => {
  it('for the selected layer at the playhead', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    useEditorStore.getState().setPlayhead(0.5)
    render(<Harness />)
    press('k')
    const keyframes = layers()[0]?.keyframes ?? []
    expect(keyframes).toHaveLength(1)
    expect(keyframes[0]?.progress).toBe(0.5)
  })

  it('does nothing when no layer is selected', () => {
    load([createLayer('a', 'rect', 'Box')])
    render(<Harness />)
    press('k')
    expect(layers()[0]?.keyframes).toEqual([])
  })

  it('is not triggered again by a held key', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('k')
    useEditorStore.getState().setPlayhead(0.5)
    press('k', { repeat: true })
    expect(layers()[0]?.keyframes).toHaveLength(1)
  })

  it('is not triggered with Ctrl held', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('k', { ctrlKey: true })
    expect(layers()[0]?.keyframes).toEqual([])
  })
})

describe('Delete and Backspace', () => {
  it('delete the selected keyframe when one is selected, and keep the layer', () => {
    load([keyframed('a')], 'a')
    useEditorStore.getState().selectKeyframe('a', 'a-k0')
    render(<Harness />)
    press('Delete')
    expect(layers()).toHaveLength(1)
    expect(layers()[0]?.keyframes.map((keyframe) => keyframe.id)).toEqual(['a-k1'])
  })

  it('delete the selected layer when no keyframe is selected', () => {
    load([keyframed('a'), keyframed('b')], 'a')
    render(<Harness />)
    press('Delete')
    expect(layers().map((layer) => layer.id)).toEqual(['b'])
    expect(useEditorStore.getState().selectedLayerId).toBeNull()
  })

  it('Backspace does the same', () => {
    load([keyframed('a')], 'a')
    render(<Harness />)
    expect(press('Backspace')).toBe(false)
    expect(layers()).toHaveLength(0)
  })

  it('do nothing when nothing is selected', () => {
    load([keyframed('a')])
    render(<Harness />)
    press('Delete')
    expect(layers()).toHaveLength(1)
  })

  it('are one undo step each', () => {
    load([keyframed('a')], 'a')
    render(<Harness />)
    press('Delete')
    press('z', { ctrlKey: true })
    expect(layers()).toHaveLength(1)
  })

  it('do not delete again when the key is held', () => {
    load([keyframed('a'), keyframed('b')], 'b')
    render(<Harness />)
    press('Delete')
    useEditorStore.getState().select('a')
    press('Delete', { repeat: true })
    expect(layers().map((layer) => layer.id)).toEqual(['a'])
  })
})

describe('arrow keys', () => {
  it('nudge the selected layer by 1%: x 30 and ArrowRight is 31', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('ArrowRight')
    expect(xOf('a')).toBe(31)
    press('ArrowLeft')
    press('ArrowLeft')
    expect(xOf('a')).toBe(29)
  })

  it('nudge by 10% with Shift: x 30 and Shift+ArrowRight is 40', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('ArrowRight', { shiftKey: true })
    expect(xOf('a')).toBe(40)
  })

  it('move up and down too', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('ArrowUp')
    press('ArrowDown', { shiftKey: true })
    expect(getLayer(selectProject(useEditorStore.getState()), 'a')?.base.y).toBe(39)
  })

  it('a held key is one undo step', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('ArrowRight')
    for (let index = 0; index < 49; index++) press('ArrowRight', { repeat: true })
    expect(xOf('a')).toBe(80)
    press('z', { ctrlKey: true })
    expect(xOf('a')).toBe(30)
  })

  it('stop the page from scrolling', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    expect(press('ArrowDown')).toBe(false)
  })

  it('do nothing when no layer is selected', () => {
    load([createLayer('a', 'rect', 'Box')])
    render(<Harness />)
    press('ArrowRight')
    expect(xOf('a')).toBe(30)
  })

  it('stay with a slider that uses them', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    const { container } = render(
      <Harness>
        <div role="slider" tabIndex={0} aria-label="Playhead" />
      </Harness>,
    )
    const slider = container.querySelector('[role="slider"]')
    if (!slider) throw new Error('slider missing')
    expect(press('ArrowRight', { target: slider })).toBe(true)
    expect(xOf('a')).toBe(30)
  })
})

describe('Space', () => {
  it('plays and pauses the preview', () => {
    render(<Harness />)
    press(' ')
    expect(useEditorStore.getState().isPlaying).toBe(true)
    press(' ')
    expect(useEditorStore.getState().isPlaying).toBe(false)
  })

  it('does not scroll the page', () => {
    render(<Harness />)
    expect(press(' ')).toBe(false)
  })

  it('does not toggle again when the key is held', () => {
    render(<Harness />)
    press(' ')
    press(' ', { repeat: true })
    expect(useEditorStore.getState().isPlaying).toBe(true)
  })

  it('leaves Space to a focused button, which it presses', () => {
    const { container } = render(
      <Harness>
        <button type="button">Press me</button>
      </Harness>,
    )
    const button = container.querySelector('button')
    if (!button) throw new Error('button missing')
    expect(press(' ', { target: button })).toBe(true)
    expect(useEditorStore.getState().isPlaying).toBe(false)
  })

  it('does nothing in the browser preview, which is scrolled by hand', () => {
    useEditorStore.getState().setPreviewMode('browser')
    render(<Harness />)
    press(' ')
    expect(useEditorStore.getState().isPlaying).toBe(false)
  })
})

describe('when the shortcuts stay quiet', () => {
  const typingFields = [
    ['an input', '<input type="text" />'],
    ['a number input', '<input type="number" />'],
    ['a textarea', '<textarea></textarea>'],
    ['a select', '<select><option>a</option></select>'],
    ['editable content', '<div contenteditable="true">text</div>'],
  ] as const

  it.each(typingFields)('while typing in %s', (_name, html) => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    const { container } = render(<Harness />)
    container.insertAdjacentHTML('beforeend', html)
    const field = container.lastElementChild
    if (!field) throw new Error('field missing')
    for (const key of ['k', 'Delete', 'Backspace', 'ArrowRight', ' ']) {
      expect(press(key, { target: field })).toBe(true)
    }
    press('z', { target: field, ctrlKey: true })
    expect(layers()).toHaveLength(1)
    expect(layers()[0]?.keyframes).toEqual([])
    expect(xOf('a')).toBe(30)
    expect(useEditorStore.getState().isPlaying).toBe(false)
  })

  it('does not stop the browser from undoing text inside a field', () => {
    const { container } = render(<Harness />)
    container.insertAdjacentHTML('beforeend', '<input type="text" />')
    const input = container.querySelector('input')
    if (!input) throw new Error('input missing')
    expect(press('z', { target: input, ctrlKey: true })).toBe(true)
  })

  it('while a dialog is open, and again when it closes', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    document.body.append(dialog)
    press('ArrowRight')
    press(' ')
    press('k')
    press('Delete')
    expect(xOf('a')).toBe(30)
    expect(useEditorStore.getState().isPlaying).toBe(false)
    expect(layers()).toHaveLength(1)
    expect(layers()[0]?.keyframes).toEqual([])
    dialog.remove()
    press('ArrowRight')
    expect(xOf('a')).toBe(31)
  })

  it('when a component has already handled the key', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    const { container } = render(
      <Harness>
        <div
          id="handler"
          tabIndex={0}
          onKeyDown={(event) => {
            event.preventDefault()
          }}
        />
      </Harness>,
    )
    const handler = container.querySelector('#handler')
    if (!handler) throw new Error('handler missing')
    press('ArrowRight', { target: handler })
    expect(xOf('a')).toBe(30)
  })

  it('while text is being composed', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    press('ArrowRight', { isComposing: true })
    expect(xOf('a')).toBe(30)
  })

  it.each([
    ['Alt+ArrowRight', 'ArrowRight', { altKey: true }],
    ['Ctrl+ArrowRight', 'ArrowRight', { ctrlKey: true }],
    ['Ctrl+Delete', 'Delete', { ctrlKey: true }],
    ['a letter with no shortcut', 'a', {}],
  ])('for %s', (_name, key, modifiers) => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    render(<Harness />)
    expect(press(key, modifiers)).toBe(true)
    expect(xOf('a')).toBe(30)
    expect(layers()).toHaveLength(1)
  })

  it('after the component is gone', () => {
    load([createLayer('a', 'rect', 'Box')], 'a')
    const { unmount } = render(<Harness />)
    unmount()
    press('ArrowRight')
    expect(xOf('a')).toBe(30)
  })
})
