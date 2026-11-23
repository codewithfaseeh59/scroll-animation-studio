import { interpolateLayer } from '../../engine/interpolate'
import type { AnimatableProperty, Layer } from '../../engine/types'
import { roundTo } from '../../lib/round'
import { formatPercent } from '../../lib/timeline'
import { useEditorStore } from '../../store/editorStore'
import { NumberField } from '../ui/NumberField'
import styles from './Inspector.module.css'

interface AnimatedField {
  property: AnimatableProperty
  label: string
  step: number
  min?: number
  max?: number
}

const ANIMATED_FIELDS: readonly AnimatedField[] = [
  { property: 'translateX', label: 'Move X (%)', step: 1 },
  { property: 'translateY', label: 'Move Y (%)', step: 1 },
  { property: 'scale', label: 'Scale', step: 0.1 },
  { property: 'rotate', label: 'Rotate (deg)', step: 1 },
  { property: 'opacity', label: 'Opacity', step: 0.1, min: 0, max: 1 },
  { property: 'blur', label: 'Blur (px)', step: 1, min: 0 },
]

/**
 * The animated values of a layer at the playhead. Changing one is auto-key:
 * it creates a keyframe at the playhead, or updates the one already there.
 */
export function AnimationFields({ layer }: { layer: Layer }) {
  const playhead = useEditorStore((state) => state.playhead)
  const selectedKeyframeId = useEditorStore((state) => state.selectedKeyframeId)
  const autoKey = useEditorStore((state) => state.autoKey)
  const addKeyframe = useEditorStore((state) => state.addKeyframe)
  const removeKeyframe = useEditorStore((state) => state.removeKeyframe)
  const values = interpolateLayer(layer, playhead)

  return (
    <>
      <h3 className={styles.section}>Animation at {formatPercent(playhead)}</h3>
      <div className={styles.grid}>
        {ANIMATED_FIELDS.map(({ property, label, step, min, max }) => (
          <NumberField
            key={property}
            label={label}
            value={roundTo(values[property], 3)}
            step={step}
            min={min}
            max={max}
            onCommit={(value) => {
              autoKey(layer.id, { [property]: value })
            }}
          />
        ))}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            addKeyframe(layer.id)
          }}
        >
          Add keyframe
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={selectedKeyframeId === null}
          onClick={() => {
            if (selectedKeyframeId !== null) removeKeyframe(layer.id, selectedKeyframeId)
          }}
        >
          Delete keyframe
        </button>
      </div>
    </>
  )
}
