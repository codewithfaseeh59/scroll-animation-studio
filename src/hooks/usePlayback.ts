import { useEffect } from 'react'
import { advancePlayhead, playbackDuration } from '../engine/playback'
import { selectProject, useEditorStore } from '../store/editorStore'

/**
 * While the preview is playing, moves the playhead forward once per animation
 * frame and stops at the end of the scene. The playhead is read from the store
 * on every frame, so scrubbing during playback continues from the new position.
 */
export function usePlayback(): void {
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const sceneLength = useEditorStore(selectProject).sceneLength
  const setPlayhead = useEditorStore((state) => state.setPlayhead)
  const pause = useEditorStore((state) => state.pause)

  useEffect(() => {
    if (!isPlaying) return
    const duration = playbackDuration(sceneLength)
    let frame = 0
    let previous: number | null = null

    const tick = (now: number): void => {
      const deltaSeconds = previous === null ? 0 : (now - previous) / 1000
      previous = now
      const step = advancePlayhead(useEditorStore.getState().playhead, deltaSeconds, duration)
      setPlayhead(step.playhead)
      if (step.finished) {
        pause()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [isPlaying, sceneLength, setPlayhead, pause])
}
