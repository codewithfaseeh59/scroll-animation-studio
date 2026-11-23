import { useRef, type KeyboardEvent } from 'react'
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
  const setPlayhead = useEditorStore((state) => state.setPlayhead)
  const tracksRef = useRef<HTMLDivElement>(null)
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

  return (
    <div className={styles.timeline}>
      <div className={styles.scroll}>
        <div className={styles.labels}>
          <div className={styles.corner}>Playhead {formatPercent(playhead)}</div>
          {topFirst.map((layer) => (
            <button
              key={layer.id}
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
              {layer.keyframes.map((keyframe) => {
                const progress =
                  draft?.keyframeId === keyframe.id ? draft.progress : keyframe.progress
                return (
                  <span
                    key={keyframe.id}
                    className={styles.diamond}
                    style={{ left: `${String(progress * 100)}%` }}
                    role="img"
                    aria-label={`Keyframe at ${formatPercent(progress)}`}
                    data-keyframe-id={keyframe.id}
                    data-selected={
                      layer.id === selectedLayerId && keyframe.id === selectedKeyframeId
                        ? ''
                        : undefined
                    }
                    onPointerDown={(event) => {
                      startKeyframeDrag(event, layer.id, keyframe)
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
