import type { CSSProperties } from 'react'
import type { ResolvedValues } from '../../engine/interpolate'
import type { Layer } from '../../engine/types'
import { toStageUnits as stageUnits } from '../../engine/units'

/**
 * Position, size and transform of a layer's box. The individual transform
 * properties apply in the fixed order translate, rotate, scale, which is also
 * how the exported CSS animates them.
 */
export function layerFrameStyle(layer: Layer, values: ResolvedValues): CSSProperties {
  const { x, y, width, height } = layer.base
  return {
    position: 'absolute',
    left: `${String(x)}%`,
    top: `${String(y)}%`,
    width: `${String(width)}%`,
    height: `${String(height)}%`,
    translate: `${String(values.translateX)}% ${String(values.translateY)}%`,
    rotate: `${String(values.rotate)}deg`,
    scale: values.scale,
  }
}

/** The layer's box plus its opacity and blur. */
export function layerBoxStyle(layer: Layer, values: ResolvedValues): CSSProperties {
  return {
    ...layerFrameStyle(layer, values),
    opacity: values.opacity,
    filter: values.blur > 0 ? `blur(${String(values.blur)}px)` : undefined,
  }
}

/** Look of the layer content: colour, text size and corner radius. */
export function layerContentStyle(layer: Layer): CSSProperties {
  const { color, fontSize, radius } = layer.style
  switch (layer.type) {
    case 'rect':
      return { background: color, borderRadius: stageUnits(radius) }
    case 'text':
      return { color, fontSize: stageUnits(fontSize) }
    case 'image':
      return { borderRadius: stageUnits(radius) }
  }
}
