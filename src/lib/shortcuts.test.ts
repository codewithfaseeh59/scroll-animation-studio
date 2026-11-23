import {
  SHORTCUTS,
  isDialogOpen,
  isTypingTarget,
  matchShortcut,
  usesArrowKeys,
  usesSpaceKey,
  type ShortcutAction,
} from './shortcuts'

function key(
  name: string,
  modifiers: Partial<{
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    altKey: boolean
  }> = {},
) {
  return { key: name, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }
}

function element(html: string): HTMLElement {
  const holder = document.createElement('div')
  holder.innerHTML = html
  document.body.append(holder)
  const found = holder.firstElementChild
  if (!(found instanceof HTMLElement)) throw new Error('no element')
  return found
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('matchShortcut', () => {
  const cases: [string, ReturnType<typeof key>, ShortcutAction | null][] = [
    ['Ctrl+Z undoes', key('z', { ctrlKey: true }), { type: 'undo' }],
    ['Cmd+Z undoes', key('z', { metaKey: true }), { type: 'undo' }],
    ['Shift+Ctrl+Z redoes', key('Z', { ctrlKey: true, shiftKey: true }), { type: 'redo' }],
    ['Shift+Cmd+Z redoes', key('Z', { metaKey: true, shiftKey: true }), { type: 'redo' }],
    ['K adds a keyframe', key('k'), { type: 'addKeyframe' }],
    ['K with Caps Lock adds a keyframe', key('K'), { type: 'addKeyframe' }],
    ['Shift+K does nothing', key('K', { shiftKey: true }), null],
    ['Delete deletes', key('Delete'), { type: 'delete' }],
    ['Backspace deletes', key('Backspace'), { type: 'delete' }],
    ['ArrowLeft nudges left by 1', key('ArrowLeft'), { type: 'nudge', dx: -1, dy: 0 }],
    ['ArrowRight nudges right by 1', key('ArrowRight'), { type: 'nudge', dx: 1, dy: 0 }],
    ['ArrowUp nudges up by 1', key('ArrowUp'), { type: 'nudge', dx: 0, dy: -1 }],
    ['ArrowDown nudges down by 1', key('ArrowDown'), { type: 'nudge', dx: 0, dy: 1 }],
    [
      'Shift+ArrowLeft nudges by 10',
      key('ArrowLeft', { shiftKey: true }),
      { type: 'nudge', dx: -10, dy: 0 },
    ],
    [
      'Shift+ArrowDown nudges by 10',
      key('ArrowDown', { shiftKey: true }),
      { type: 'nudge', dx: 0, dy: 10 },
    ],
    ['Space toggles playback', key(' '), { type: 'togglePlay' }],
  ]

  it.each(cases)('%s', (_name, event, expected) => {
    expect(matchShortcut(event)).toEqual(expected)
  })

  it.each([
    ['a letter with no shortcut', key('a')],
    ['Enter', key('Enter')],
    ['Ctrl+C', key('c', { ctrlKey: true })],
    ['Ctrl+K', key('k', { ctrlKey: true })],
    ['Ctrl+ArrowLeft', key('ArrowLeft', { ctrlKey: true })],
    ['Alt+Z', key('z', { altKey: true })],
    ['Alt+Ctrl+Z', key('z', { altKey: true, ctrlKey: true })],
    ['Alt+ArrowLeft', key('ArrowLeft', { altKey: true })],
    ['Ctrl+Space', key(' ', { ctrlKey: true })],
    ['Ctrl+Delete', key('Delete', { ctrlKey: true })],
  ])('%s is not a shortcut', (_name, event) => {
    expect(matchShortcut(event)).toBeNull()
  })
})

describe('isTypingTarget', () => {
  it.each([
    '<input type="text">',
    '<input type="number">',
    '<input type="color">',
    '<textarea></textarea>',
    '<select><option>a</option></select>',
    '<div contenteditable="true"></div>',
    '<div contenteditable=""></div>',
  ])('%s is somewhere to type', (html) => {
    expect(isTypingTarget(element(html))).toBe(true)
  })

  it('an element inside editable content counts too', () => {
    const editable = element('<div contenteditable="true"><span id="inner">x</span></div>')
    expect(isTypingTarget(editable.querySelector('#inner'))).toBe(true)
  })

  it.each([
    '<button>Go</button>',
    '<div>text</div>',
    '<div contenteditable="false"></div>',
    '<a href="#x">link</a>',
  ])('%s is not', (html) => {
    expect(isTypingTarget(element(html))).toBe(false)
  })

  it('null and non-elements are not', () => {
    expect(isTypingTarget(null)).toBe(false)
    expect(isTypingTarget(window)).toBe(false)
    expect(isTypingTarget(document)).toBe(false)
  })
})

describe('usesSpaceKey and usesArrowKeys', () => {
  it.each([
    '<button>Go</button>',
    '<a href="#x">link</a>',
    '<div role="tab"></div>',
    '<div role="slider"></div>',
    '<div role="button"></div>',
  ])('Space belongs to %s', (html) => {
    expect(usesSpaceKey(element(html))).toBe(true)
  })

  it('Space belongs to the inside of a button too', () => {
    const button = element('<button><span id="label">Go</span></button>')
    expect(usesSpaceKey(button.querySelector('#label'))).toBe(true)
  })

  it.each(['<div></div>', '<span>text</span>'])('Space is free on %s', (html) => {
    expect(usesSpaceKey(element(html))).toBe(false)
  })

  it.each(['<div role="slider"></div>', '<div role="tab"></div>', '<div role="listbox"></div>'])(
    'the arrow keys belong to %s',
    (html) => {
      expect(usesArrowKeys(element(html))).toBe(true)
    },
  )

  it('the arrow keys are free on a button and on the page', () => {
    expect(usesArrowKeys(element('<button>Go</button>'))).toBe(false)
    expect(usesArrowKeys(document.body)).toBe(false)
    expect(usesArrowKeys(null)).toBe(false)
  })
})

describe('isDialogOpen', () => {
  it('is false without a dialog and true with a modal dialog', () => {
    expect(isDialogOpen()).toBe(false)
    element('<div role="dialog" aria-modal="true"></div>')
    expect(isDialogOpen()).toBe(true)
  })

  it('ignores a dialog that is not modal', () => {
    element('<div role="dialog"></div>')
    expect(isDialogOpen()).toBe(false)
  })
})

describe('SHORTCUTS', () => {
  it('lists the seven shortcuts, each with keys and a description', () => {
    expect(SHORTCUTS).toHaveLength(7)
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.keys).not.toBe('')
      expect(shortcut.description).not.toBe('')
    }
  })

  it('names every key the editor reacts to', () => {
    const keys = SHORTCUTS.map((shortcut) => shortcut.keys).join(' | ')
    for (const word of ['Z', 'K', 'Delete', 'Backspace', 'Arrow', 'Shift', 'Space']) {
      expect(keys).toContain(word)
    }
  })
})
