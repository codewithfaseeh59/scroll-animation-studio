import { useRef, type CSSProperties } from 'react'
import { useLayerDrag } from '../../hooks/useLayerDrag'
import { selectProject, useEditorStore } from '../../store/editorStore'
import styles from './Stage.module.css'
import { StageLayer } from './StageLayer'

export function Stage() {
  const project = useEditorStore(selectProject)
  const playhead = useEditorStore((state) => state.playhead)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const select = useEditorStore((state) => state.select)
  const frameRef = useRef<HTMLDivElement>(null)
  const { draft, startDrag } = useLayerDrag(frameRef)
  const { width, height } = project.aspectRatio
  const frameStyle = { '--ratio': width / height } as CSSProperties

  return (
    <div className={styles.viewport}>
      <div
        ref={frameRef}
        className={styles.frame}
        style={frameStyle}
        data-stage-frame=""
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) select(null)
        }}
      >
        {project.layers.map((layer) => (
          <StageLayer
            key={layer.id}
            layer={draft?.layerId === layer.id ? { ...layer, base: draft.base } : layer}
            progress={playhead}
            selected={layer.id === selectedLayerId}
            onPointerDown={(event) => {
              startDrag(event, layer)
            }}
          />
        ))}
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
    </div>
  )
}
