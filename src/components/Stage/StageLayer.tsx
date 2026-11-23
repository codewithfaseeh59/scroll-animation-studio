import { interpolateLayer } from '../../engine/interpolate'
import type { Layer } from '../../engine/types'
import { layerBoxStyle, layerContentStyle } from './layerStyle'
import styles from './Stage.module.css'

interface StageLayerProps {
  layer: Layer
  progress: number
}

export function StageLayer({ layer, progress }: StageLayerProps) {
  const box = layerBoxStyle(layer, interpolateLayer(layer, progress))
  const content = layerContentStyle(layer)

  return (
    <div style={box} data-layer-id={layer.id}>
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
