import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { ResolvedValues } from '../engine/interpolate'
import type { Layer, LayerBase } from '../engine/types'
import {
  resizeBox,
  rotateByDrag,
  snapPosition,
  type Point,
  type ResizeHandle,
  type SnapGuides,
} from '../lib/geometry'
import { createId } from '../lib/id'
import { selectProject, useEditorStore } from '../store/editorStore'

type DragAction =
  | { kind: 'move' }
  | { kind: 'resize'; handle: ResizeHandle; rotation: number; scale: number }
  | { kind: 'rotate'; startRotation: number; center: Point; progress: number }

/** What stays fixed while one gesture is in progress. */
interface DragSession {
  layerId: string
  start: Point
  startBase: LayerBase
  frameWidth: number
  frameHeight: number
  otherBases: LayerBase[]
  action: DragAction
}

export interface DragDraft {
  layerId: string
  base: LayerBase
  /** The rotation being dragged to, or null when the gesture is not a rotation. */
  rotation: number | null
  guides: SnapGuides
}

type PointerStart = ReactPointerEvent<HTMLElement>

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function roundBase(base: LayerBase): LayerBase {
  return {
    x: roundTo(base.x, 2),
    y: roundTo(base.y, 2),
    width: roundTo(base.width, 2),
    height: roundTo(base.height, 2),
  }
}

/**
 * Selecting a layer and dragging it, resizing it by a handle or rotating it
 * by the rotate handle. While the pointer moves, the result only lives in
 * `draft` so the stage can draw it. The project changes once, on release, which
 * makes a whole gesture one undo step. A click without movement changes nothing.
 *
 * Moving and resizing change the layer's base. A layer has no fixed rotation
 * (rotation is an animated value), so releasing a rotation writes a keyframe
 * with that rotation at the current playhead.
 */
export function useLayerDrag(frameRef: RefObject<HTMLElement | null>): {
  draft: DragDraft | null
  startDrag: (event: PointerStart, layer: Layer) => void
  startResize: (
    event: PointerStart,
    layer: Layer,
    handle: ResizeHandle,
    values: ResolvedValues,
  ) => void
  startRotate: (event: PointerStart, layer: Layer, values: ResolvedValues) => void
} {
  const project = useEditorStore(selectProject)
  const select = useEditorStore((state) => state.select)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const upsertKeyframe = useEditorStore((state) => state.upsertKeyframe)
  const [session, setSession] = useState<DragSession | null>(null)
  const [draft, setDraft] = useState<DragDraft | null>(null)
  const latest = useRef<DragDraft | null>(null)

  const begin = (event: PointerStart, layer: Layer, action: DragAction): void => {
    if (event.button !== 0) return
    select(layer.id)
    const frame = frameRef.current
    if (!frame) return
    const { width, height } = frame.getBoundingClientRect()
    if (width === 0 || height === 0) return
    setSession({
      layerId: layer.id,
      start: { x: event.clientX, y: event.clientY },
      startBase: layer.base,
      frameWidth: width,
      frameHeight: height,
      otherBases: project.layers.filter((item) => item.id !== layer.id).map((item) => item.base),
      action,
    })
  }

  const startDrag = (event: PointerStart, layer: Layer): void => {
    begin(event, layer, { kind: 'move' })
  }

  const startResize = (
    event: PointerStart,
    layer: Layer,
    handle: ResizeHandle,
    values: ResolvedValues,
  ): void => {
    begin(event, layer, { kind: 'resize', handle, rotation: values.rotate, scale: values.scale })
  }

  const startRotate = (event: PointerStart, layer: Layer, values: ResolvedValues): void => {
    const box = event.currentTarget.closest('[data-selection-box]')
    if (!box) return
    const rect = box.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    begin(event, layer, {
      kind: 'rotate',
      startRotation: values.rotate,
      center,
      progress: useEditorStore.getState().playhead,
    })
  }

  useEffect(() => {
    if (!session) return

    const draftFor = (pointer: Point): DragDraft => {
      const { action, startBase, start } = session
      const deltaX = pointer.x - start.x
      const deltaY = pointer.y - start.y
      switch (action.kind) {
        case 'move': {
          const snapped = snapPosition(
            {
              ...startBase,
              x: startBase.x + (deltaX / session.frameWidth) * 100,
              y: startBase.y + (deltaY / session.frameHeight) * 100,
            },
            session.otherBases,
          )
          return {
            layerId: session.layerId,
            base: roundBase({ ...startBase, x: snapped.x, y: snapped.y }),
            rotation: null,
            guides: snapped.guides,
          }
        }
        case 'resize':
          return {
            layerId: session.layerId,
            base: roundBase(
              resizeBox(
                startBase,
                action.handle,
                deltaX,
                deltaY,
                { width: session.frameWidth, height: session.frameHeight },
                action.rotation,
                action.scale,
              ),
            ),
            rotation: null,
            guides: { x: [], y: [] },
          }
        case 'rotate':
          return {
            layerId: session.layerId,
            base: startBase,
            rotation: roundTo(rotateByDrag(action.startRotation, action.center, start, pointer), 1),
            guides: { x: [], y: [] },
          }
      }
    }

    const handleMove = (event: PointerEvent): void => {
      const next = draftFor({ x: event.clientX, y: event.clientY })
      latest.current = next
      setDraft(next)
    }

    const handleEnd = (): void => {
      const finished = latest.current
      latest.current = null
      setSession(null)
      setDraft(null)
      if (!finished) return
      if (session.action.kind === 'rotate' && finished.rotation !== null) {
        upsertKeyframe(session.layerId, {
          id: createId(),
          progress: session.action.progress,
          values: { rotate: finished.rotation },
          ease: 'linear',
        })
      } else {
        updateLayer(session.layerId, { base: finished.base })
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
  }, [session, updateLayer, upsertKeyframe])

  return { draft, startDrag, startResize, startRotate }
}
