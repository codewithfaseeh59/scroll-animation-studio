import type { PointerEvent } from 'react'
import { interpolateLayer } from '../../engine/interpolate'
import type { Layer } from '../../engine/types'
import { layerBoxStyle, layerContentStyle } from './layerStyle'
import styles from './Stage.module.css'

interface StageLayerProps {
  layer: Layer
  progress: number
  selected: boolean
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
}

export function StageLayer({ layer, progress, selected, onPointerDown }: StageLayerProps) {
  const box = layerBoxStyle(layer, interpolateLayer(layer, progress))
  const content = layerContentStyle(layer)

  return (
    <div
      className={styles.layer}
      style={box}
      data-layer-id={layer.id}
      data-selected={selected ? '' : undefined}
      onPointerDown={onPointerDown}
    >
      {layer.type === 'text' && (
        <div className={styles.text} style={content}>
          {layer.style.text}
        </div>
      )}
      {layer.type === 'rect' && <div className={styles.fill} style={content} />}
      {layer.type === 'image' &&
        (layer.style.src === '' ? (
          <div className={styles.placeholder} style={content} data-image-placeholder="" />
        ) : (
          <img className={styles.image} style={content} src={layer.style.src} alt={layer.name} />
        ))}
    </div>
  )
}
