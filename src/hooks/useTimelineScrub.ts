import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { progressFromPointer } from '../lib/timeline'
import { useEditorStore } from '../store/editorStore'

/**
 * Scrubbing the playhead: pressing on the track jumps the playhead to the
 * pointer, and dragging keeps it following until the pointer is released,
 * even when the pointer leaves the track.
 */
export function useTimelineScrub(trackRef: RefObject<HTMLElement | null>): {
  startScrub: (event: ReactPointerEvent<HTMLElement>) => void
} {
  const setPlayhead = useEditorStore((state) => state.setPlayhead)
  const [scrubbing, setScrubbing] = useState(false)

  const scrubTo = useCallback(
    (clientX: number): void => {
      const track = trackRef.current
      if (!track) return
      const { left, width } = track.getBoundingClientRect()
      if (width === 0) return
      setPlayhead(progressFromPointer(clientX, left, width))
    },
    [trackRef, setPlayhead],
  )

  useEffect(() => {
    if (!scrubbing) return
    const handleMove = (event: PointerEvent): void => {
      scrubTo(event.clientX)
    }
    const handleEnd = (): void => {
      setScrubbing(false)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }
  }, [scrubbing, scrubTo])

  const startScrub = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return
    scrubTo(event.clientX)
    setScrubbing(true)
  }

  return { startScrub }
}
