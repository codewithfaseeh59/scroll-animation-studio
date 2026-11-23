import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { Layer, LayerBase } from '../engine/types'
import { snapPosition, type SnapGuides } from '../lib/geometry'
import { selectProject, useEditorStore } from '../store/editorStore'

/** What stays fixed while one drag is in progress. */
interface DragSession {
  layerId: string
  startX: number
  startY: number
  startBase: LayerBase
  frameWidth: number
  frameHeight: number
  otherBases: LayerBase[]
}

export interface DragDraft {
  layerId: string
  base: LayerBase
  guides: SnapGuides
}

const PERCENT_DECIMALS = 100

function roundPercent(value: number): number {
  return Math.round(value * PERCENT_DECIMALS) / PERCENT_DECIMALS
}

/**
 * Selecting and dragging layers on the stage. While the pointer moves, the
 * moved position only lives in `draft` (so the stage can draw it). The project
 * is changed once, on release, which makes a whole drag one undo step. A click
 * without movement selects the layer and changes nothing.
 */
export function useLayerDrag(frameRef: RefObject<HTMLElement | null>): {
  draft: DragDraft | null
  startDrag: (event: ReactPointerEvent<HTMLElement>, layer: Layer) => void
} {
  const project = useEditorStore(selectProject)
  const select = useEditorStore((state) => state.select)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const [session, setSession] = useState<DragSession | null>(null)
  const [draft, setDraft] = useState<DragDraft | null>(null)
  const latest = useRef<DragDraft | null>(null)

  const startDrag = (event: ReactPointerEvent<HTMLElement>, layer: Layer): void => {
    if (event.button !== 0) return
    select(layer.id)
    const frame = frameRef.current
    if (!frame) return
    const { width, height } = frame.getBoundingClientRect()
    if (width === 0 || height === 0) return
    setSession({
      layerId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      startBase: layer.base,
      frameWidth: width,
      frameHeight: height,
      otherBases: project.layers.filter((item) => item.id !== layer.id).map((item) => item.base),
    })
  }

  useEffect(() => {
    if (!session) return

    const handleMove = (event: PointerEvent): void => {
      const deltaX = ((event.clientX - session.startX) / session.frameWidth) * 100
      const deltaY = ((event.clientY - session.startY) / session.frameHeight) * 100
      const snapped = snapPosition(
        { ...session.startBase, x: session.startBase.x + deltaX, y: session.startBase.y + deltaY },
        session.otherBases,
      )
      const next: DragDraft = {
        layerId: session.layerId,
        base: { ...session.startBase, x: roundPercent(snapped.x), y: roundPercent(snapped.y) },
        guides: snapped.guides,
      }
      latest.current = next
      setDraft(next)
    }

    const handleEnd = (): void => {
      const finished = latest.current
      latest.current = null
      setSession(null)
      setDraft(null)
      if (finished) {
        updateLayer(session.layerId, { base: { x: finished.base.x, y: finished.base.y } })
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
  }, [session, updateLayer])

  return { draft, startDrag }
}
