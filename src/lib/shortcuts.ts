export type ShortcutAction =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'addKeyframe' }
  | { type: 'delete' }
  | { type: 'nudge'; dx: number; dy: number }
  | { type: 'togglePlay' }

interface KeyInfo {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

const NUDGE_STEP = 1
const BIG_NUDGE_STEP = 10

/** What a key press asks for, or null when it is not one of the editor's shortcuts. */
export function matchShortcut(event: KeyInfo): ShortcutAction | null {
  if (event.altKey) return null
  if (event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() !== 'z') return null
    return event.shiftKey ? { type: 'redo' } : { type: 'undo' }
  }
  const step = event.shiftKey ? BIG_NUDGE_STEP : NUDGE_STEP
  switch (event.key) {
    case 'k':
    case 'K':
      return event.shiftKey ? null : { type: 'addKeyframe' }
    case 'Delete':
    case 'Backspace':
      return { type: 'delete' }
    case 'ArrowLeft':
      return { type: 'nudge', dx: -step, dy: 0 }
    case 'ArrowRight':
      return { type: 'nudge', dx: step, dy: 0 }
    case 'ArrowUp':
      return { type: 'nudge', dx: 0, dy: -step }
    case 'ArrowDown':
      return { type: 'nudge', dx: 0, dy: step }
    case ' ':
      return { type: 'togglePlay' }
    default:
      return null
  }
}

/** Whether the key press goes to something the user is typing into. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select') !== null) return true
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

const USES_SPACE =
  'button, a[href], summary, [role="button"], [role="tab"], [role="slider"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="option"]'

/** Whether Space already means something for this element, such as pressing a button. */
export function usesSpaceKey(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(USES_SPACE) !== null
}

const USES_ARROWS = '[role="slider"], [role="tab"], [role="listbox"], [role="menu"], [role="radio"]'

/** Whether the arrow keys already move something inside this element. */
export function usesArrowKeys(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(USES_ARROWS) !== null
}

/** Whether a modal dialog is open. Shortcuts stay quiet behind it. */
export function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null
}

export interface ShortcutHelp {
  keys: string
  description: string
}

/** The shortcuts as shown to the user. */
export const SHORTCUTS: readonly ShortcutHelp[] = [
  { keys: 'Ctrl/⌘ + Z', description: 'Undo' },
  { keys: 'Shift + Ctrl/⌘ + Z', description: 'Redo' },
  { keys: 'K', description: 'Add a keyframe for the selected layer at the playhead' },
  {
    keys: 'Delete or Backspace',
    description: 'Delete the selected keyframe, or the selected layer when no keyframe is selected',
  },
  { keys: 'Arrow keys', description: 'Move the selected layer by 1%' },
  { keys: 'Shift + Arrow keys', description: 'Move the selected layer by 10%' },
  { keys: 'Space', description: 'Play or pause the preview' },
]
