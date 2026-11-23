import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { Keyframe } from '../engine/types'
import { roundTo } from '../lib/round'
import { progressFromPointer } from '../lib/timeline'
import { useEditorStore } from '../store/editorStore'

interface KeyframeDragSession {
  layerId: string
  keyframeId: string
  startProgress: number
}

export interface KeyframeDragDraft {
  layerId: string
  keyframeId: string
  progress: number
}

/**
 * Dragging a keyframe diamond along the timeline. Pressing a diamond selects
 * the keyframe and moves the playhead onto it. Moving the pointer only changes
 * `draft`, which the timeline draws; the project changes once on release, so a
 * drag is one undo step. A keyframe cannot be dropped onto another keyframe's
 * progress: the project refuses it and the diamond springs back.
 */
export function useKeyframeDrag(trackRef: RefObject<HTMLElement | null>): {
  draft: KeyframeDragDraft | null
  startKeyframeDrag: (
    event: ReactPointerEvent<HTMLElement>,
    layerId: string,
    keyframe: Keyframe,
  ) => void
} {
  const selectKeyframe = useEditorStore((state) => state.selectKeyframe)
  const setPlayhead = useEditorStore((state) => state.setPlayhead)
  const updateKeyframe = useEditorStore((state) => state.updateKeyframe)
  const [session, setSession] = useState<KeyframeDragSession | null>(null)
  const [draft, setDraft] = useState<KeyframeDragDraft | null>(null)
  const latest = useRef<KeyframeDragDraft | null>(null)

  const startKeyframeDrag = (
    event: ReactPointerEvent<HTMLElement>,
    layerId: string,
    keyframe: Keyframe,
  ): void => {
    if (event.button !== 0) return
    // Keep the press from also scrubbing the playhead to the pointer.
    event.stopPropagation()
    selectKeyframe(layerId, keyframe.id)
    setPlayhead(keyframe.progress)
    setSession({ layerId, keyframeId: keyframe.id, startProgress: keyframe.progress })
  }

  useEffect(() => {
    if (!session) return

    const handleMove = (event: PointerEvent): void => {
      const track = trackRef.current
      if (!track) return
      const { left, width } = track.getBoundingClientRect()
      if (width === 0) return
      const next = {
        layerId: session.layerId,
        keyframeId: session.keyframeId,
        progress: roundTo(progressFromPointer(event.clientX, left, width), 3),
      }
      latest.current = next
      setDraft(next)
    }

    const handleEnd = (): void => {
      const finished = latest.current
      latest.current = null
      setSession(null)
      setDraft(null)
      if (finished && finished.progress !== session.startProgress) {
        updateKeyframe(session.layerId, session.keyframeId, { progress: finished.progress })
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }
  }, [session, trackRef, updateKeyframe])

  return { draft, startKeyframeDrag }
}
