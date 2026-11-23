import type { CSSProperties, PointerEvent } from 'react'
import type { ResolvedValues } from '../../engine/interpolate'
import type { Layer } from '../../engine/types'
import { RESIZE_HANDLES, type ResizeHandle } from '../../lib/geometry'
import { layerFrameStyle } from './layerStyle'
import styles from './Stage.module.css'

interface SelectionOverlayProps {
  layer: Layer
  values: ResolvedValues
  onResizeStart: (event: PointerEvent<HTMLDivElement>, handle: ResizeHandle) => void
  onRotateStart: (event: PointerEvent<HTMLDivElement>) => void
}

const HANDLE_POSITIONS: Record<ResizeHandle, CSSProperties> = {
  n: { left: '50%', top: 0, cursor: 'ns-resize' },
  ne: { left: '100%', top: 0, cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: 0, top: '100%', cursor: 'nesw-resize' },
  w: { left: 0, top: '50%', cursor: 'ew-resize' },
  nw: { left: 0, top: 0, cursor: 'nwse-resize' },
}

/**
 * Outline and handles of the selected layer. It lives outside the clipped
 * stage so handles at the stage edge stay visible, and it follows the layer's
 * position, rotation and scale.
 */
export function SelectionOverlay({
  layer,
  values,
  onResizeStart,
  onRotateStart,
}: SelectionOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div
        className={styles.selection}
        style={layerFrameStyle(layer, values)}
        data-selection-box=""
      >
        {RESIZE_HANDLES.map((handle) => (
          <div
            key={handle}
            className={styles.handle}
            style={HANDLE_POSITIONS[handle]}
            data-handle={handle}
            onPointerDown={(event) => {
              onResizeStart(event, handle)
            }}
          />
        ))}
        <div className={styles.rotateHandle} data-handle="rotate" onPointerDown={onRotateStart} />
      </div>
    </div>
  )
}
