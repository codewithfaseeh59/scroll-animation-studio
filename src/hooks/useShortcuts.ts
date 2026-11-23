import { useEffect } from 'react'
import {
  isDialogOpen,
  isTypingTarget,
  matchShortcut,
  usesArrowKeys,
  usesSpaceKey,
  type ShortcutAction,
} from '../lib/shortcuts'
import { useEditorStore } from '../store/editorStore'

function run(action: ShortcutAction): void {
  const state = useEditorStore.getState()
  const { selectedLayerId, selectedKeyframeId } = state
  switch (action.type) {
    case 'undo':
      state.undo()
      break
    case 'redo':
      state.redo()
      break
    case 'addKeyframe':
      if (selectedLayerId !== null) state.addKeyframe(selectedLayerId)
      break
    case 'delete':
      if (selectedLayerId === null) break
      if (selectedKeyframeId !== null) state.removeKeyframe(selectedLayerId, selectedKeyframeId)
      else state.removeLayer(selectedLayerId)
      break
    case 'nudge':
      if (selectedLayerId !== null) state.nudgeLayer(selectedLayerId, action.dx, action.dy)
      break
    case 'togglePlay':
      state.togglePlay()
      break
  }
}

/** Actions that must not repeat while a key is held down. */
const ONCE_PER_PRESS: ReadonlySet<ShortcutAction['type']> = new Set([
  'addKeyframe',
  'delete',
  'togglePlay',
])

/**
 * The keyboard shortcuts of the editor. They stay quiet while the user types
 * in a field, while a dialog is open, when a component has already handled the
 * key, and where the key already means something (Space on a button, the arrow
 * keys on a slider). A handled key does not also scroll the page.
 */
export function useShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return
      if (isTypingTarget(event.target) || isDialogOpen()) return
      const action = matchShortcut(event)
      if (!action) return
      if (action.type === 'togglePlay') {
        if (usesSpaceKey(event.target)) return
        // The browser preview is scrolled by hand, so there is nothing to play.
        if (useEditorStore.getState().previewMode === 'browser') return
      }
      if (action.type === 'nudge' && usesArrowKeys(event.target)) return
      event.preventDefault()
      if (event.repeat && ONCE_PER_PRESS.has(action.type)) return
      run(action)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
