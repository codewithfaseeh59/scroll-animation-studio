import { useRef, type CSSProperties } from 'react'
import { useLayerDrag } from '../../hooks/useLayerDrag'
import { interpolateLayer, type ResolvedValues } from '../../engine/interpolate'
import type { Layer } from '../../engine/types'
import { selectProject, useEditorStore } from '../../store/editorStore'
import { SelectionOverlay } from './SelectionOverlay'
import styles from './Stage.module.css'
import { StageLayer } from './StageLayer'

export function Stage() {
  const project = useEditorStore(selectProject)
  const playhead = useEditorStore((state) => state.playhead)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const select = useEditorStore((state) => state.select)
  const frameRef = useRef<HTMLDivElement>(null)
  const { draft, startDrag, startResize, startRotate } = useLayerDrag(frameRef)
  const { width, height } = project.aspectRatio
  const frameStyle = { '--ratio': width / height } as CSSProperties

  /** The layer and its values as drawn right now, including a gesture in progress. */
  const shown = (layer: Layer): { layer: Layer; values: ResolvedValues } => {
    const values = interpolateLayer(layer, playhead)
    if (draft?.layerId !== layer.id) return { layer, values }
    return {
      layer: { ...layer, base: draft.base },
      values: draft.rotation === null ? values : { ...values, rotate: draft.rotation },
    }
  }

  const selected = project.layers.find((layer) => layer.id === selectedLayerId)
  const selectedView = selected ? shown(selected) : undefined

  return (
    <div className={styles.viewport}>
      <div
        ref={frameRef}
        className={styles.frame}
        style={frameStyle}
        data-stage-frame=""
        onPointerDown={(event) => {
          const target = event.target
          if (target instanceof Element && !target.closest('[data-layer-id], [data-handle]')) {
            select(null)
          }
        }}
      >
        <div className={styles.clip}>
          {project.layers.map((layer) => {
            const view = shown(layer)
            return (
              <StageLayer
                key={layer.id}
                layer={view.layer}
                values={view.values}
                selected={layer.id === selectedLayerId}
                onPointerDown={(event) => {
                  startDrag(event, layer)
                }}
              />
            )
          })}
          {draft?.guides.x.map((x) => (
            <div
              key={`x${String(x)}`}
              className={styles.guideVertical}
              style={{ left: `${String(x)}%` }}
              data-guide="x"
              aria-hidden="true"
            />
          ))}
          {draft?.guides.y.map((y) => (
            <div
              key={`y${String(y)}`}
              className={styles.guideHorizontal}
              style={{ top: `${String(y)}%` }}
              data-guide="y"
              aria-hidden="true"
            />
          ))}
        </div>
        {selected && selectedView && (
          <SelectionOverlay
            layer={selectedView.layer}
            values={selectedView.values}
            onResizeStart={(event, handle) => {
              startResize(event, selected, handle, selectedView.values)
            }}
            onRotateStart={(event) => {
              startRotate(event, selected, selectedView.values)
            }}
          />
        )}
      </div>
    </div>
  )
}
