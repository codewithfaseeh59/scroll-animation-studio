import { useRef, type KeyboardEvent } from 'react'
import type { Keyframe, Layer } from '../../engine/types'
import { useKeyframeDrag } from '../../hooks/useKeyframeDrag'
import { useTimelineScrub } from '../../hooks/useTimelineScrub'
import { formatPercent } from '../../lib/timeline'
import { selectProject, useEditorStore } from '../../store/editorStore'
import styles from './Timeline.module.css'

const TICKS = Array.from({ length: 11 }, (_, index) => index * 10)
const STEP = 0.01
const BIG_STEP = 0.1

export function Timeline() {
  const project = useEditorStore(selectProject)
  const playhead = useEditorStore((state) => state.playhead)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectedKeyframeId = useEditorStore((state) => state.selectedKeyframeId)
  const select = useEditorStore((state) => state.select)
  const selectKeyframe = useEditorStore((state) => state.selectKeyframe)
  const setPlayhead = useEditorStore((state) => state.setPlayhead)
  const shiftKeyframe = useEditorStore((state) => state.shiftKeyframe)
  const removeKeyframe = useEditorStore((state) => state.removeKeyframe)
  const tracksRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const diamondRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const { startScrub } = useTimelineScrub(tracksRef)
  const { draft, startKeyframeDrag } = useKeyframeDrag(tracksRef)

  // The last layer is drawn on top, so it is listed first, like in the layer list.
  const topFirst = [...project.layers].reverse()

  const handleRulerKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? BIG_STEP : STEP
    switch (event.key) {
      case 'ArrowRight':
        setPlayhead(playhead + step)
        break
      case 'ArrowLeft':
        setPlayhead(playhead - step)
        break
      case 'Home':
        setPlayhead(0)
        break
      case 'End':
        setPlayhead(1)
        break
      default:
        return
    }
    event.preventDefault()
  }

  /** Deletes a keyframe. Focus moves to a neighbour first, so keyboard users keep their place. */
  const deleteKeyframe = (layer: Layer, index: number): void => {
    const keyframe = layer.keyframes[index]
    if (!keyframe) return
    const neighbour = layer.keyframes[index + 1] ?? layer.keyframes[index - 1]
    const target = neighbour ? diamondRefs.current[neighbour.id] : labelRefs.current[layer.id]
    target?.focus()
    removeKeyframe(layer.id, keyframe.id)
  }

  const handleDiamondKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    layer: Layer,
    keyframe: Keyframe,
    index: number,
  ): void => {
    const step = event.shiftKey ? BIG_STEP : STEP
    if (event.key === 'ArrowLeft') shiftKeyframe(layer.id, keyframe.id, -step)
    else if (event.key === 'ArrowRight') shiftKeyframe(layer.id, keyframe.id, step)
    else if (event.key === 'Delete' || event.key === 'Backspace') deleteKeyframe(layer, index)
    else return
    event.preventDefault()
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.scroll}>
        <div className={styles.labels}>
          <div className={styles.corner}>Playhead {formatPercent(playhead)}</div>
          {topFirst.map((layer) => (
            <button
              key={layer.id}
              ref={(element) => {
                labelRefs.current[layer.id] = element
              }}
              type="button"
              className={styles.label}
              aria-pressed={layer.id === selectedLayerId}
              onClick={() => {
                select(layer.id)
              }}
            >
              {layer.name}
            </button>
          ))}
        </div>
        <div ref={tracksRef} className={styles.tracks} onPointerDown={startScrub}>
          <div
            className={styles.ruler}
            role="slider"
            tabIndex={0}
            aria-label="Playhead"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(playhead * 1000) / 10}
            aria-valuetext={formatPercent(playhead)}
            onKeyDown={handleRulerKeyDown}
          >
            {TICKS.map((tick) => (
              <span
                key={tick}
                className={styles.tick}
                style={{ left: `${String(tick)}%` }}
                data-tick={tick}
                data-edge={tick === 0 ? 'start' : tick === 100 ? 'end' : undefined}
              >
                {tick}%
              </span>
            ))}
          </div>
          {topFirst.map((layer) => (
            <div
              key={layer.id}
              className={styles.track}
              data-layer-row={layer.id}
              data-selected={layer.id === selectedLayerId ? '' : undefined}
              onPointerDown={() => {
                select(layer.id)
              }}
            >
              {layer.keyframes.map((keyframe, index) => {
                const progress =
                  draft?.keyframeId === keyframe.id ? draft.progress : keyframe.progress
                return (
                  <button
                    key={keyframe.id}
                    ref={(element) => {
                      diamondRefs.current[keyframe.id] = element
                    }}
                    type="button"
                    className={styles.diamond}
                    style={{ left: `${String(progress * 100)}%` }}
                    aria-label={`${layer.name}: keyframe at ${formatPercent(progress)}`}
                    aria-pressed={
                      layer.id === selectedLayerId && keyframe.id === selectedKeyframeId
                    }
                    data-keyframe-id={keyframe.id}
                    data-selected={
                      layer.id === selectedLayerId && keyframe.id === selectedKeyframeId
                        ? ''
                        : undefined
                    }
                    onPointerDown={(event) => {
                      startKeyframeDrag(event, layer.id, keyframe)
                    }}
                    onFocus={() => {
                      selectKeyframe(layer.id, keyframe.id)
                    }}
                    onClick={(event) => {
                      // A click made with the keyboard (Enter or Space) has no pointer position.
                      if (event.detail !== 0) return
                      selectKeyframe(layer.id, keyframe.id)
                      setPlayhead(keyframe.progress)
                    }}
                    onKeyDown={(event) => {
                      handleDiamondKeyDown(event, layer, keyframe, index)
                    }}
                  />
                )
              })}
            </div>
          ))}
          <div
            className={styles.playhead}
            style={{ left: `${String(playhead * 100)}%` }}
            data-playhead=""
            aria-hidden="true"
          />
        </div>
      </div>
      {topFirst.length === 0 && <p className={styles.empty}>Add a layer to start animating.</p>}
    </div>
  )
}
