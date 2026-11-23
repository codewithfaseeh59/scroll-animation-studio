import type { CSSProperties } from 'react'
import type { ResolvedValues } from '../../engine/interpolate'
import type { Layer } from '../../engine/types'

/**
 * Font sizes and radii are measured against a reference stage that is 1000
 * units wide, so 32 means 3.2% of the stage width (3.2cqw). The stage is a
 * size container, which makes the layout scale with the stage.
 */
const STAGE_UNITS = 1000

function stageUnits(value: number): string {
  return `${String((value * 100) / STAGE_UNITS)}cqw`
}

/**
 * Position, size and animated transform of a layer. The individual transform
 * properties apply in the fixed order translate, rotate, scale, which is also
 * how the exported CSS animates them.
 */
export function layerBoxStyle(layer: Layer, values: ResolvedValues): CSSProperties {
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
