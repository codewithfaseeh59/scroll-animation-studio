import { EASE_NAMES, type EaseName, type Layer } from '../../engine/types'
import { easeCurvePoints } from '../../lib/easeCurve'
import { formatPercent } from '../../lib/timeline'
import { useEditorStore } from '../../store/editorStore'
import { SelectField } from '../ui/SelectField'
import styles from './Inspector.module.css'

const EASE_LABELS: Record<EaseName, string> = {
  linear: 'Linear',
  easeIn: 'Ease in',
  easeOut: 'Ease out',
  easeInOut: 'Ease in-out',
  power2In: 'Power2 in',
  power2Out: 'Power2 out',
  power2InOut: 'Power2 in-out',
  sineInOut: 'Sine in-out',
}

const EASE_OPTIONS = EASE_NAMES.map((name) => ({ value: name, label: EASE_LABELS[name] }))

const CURVE_WIDTH = 100
const CURVE_HEIGHT = 50
const CURVE_SAMPLES = 40

/**
 * Settings of the selected keyframe. Its easing shapes the motion from the
 * previous keyframe into this one, so the first keyframe has nothing to shape.
 */
export function KeyframeFields({ layer }: { layer: Layer }) {
  const selectedKeyframeId = useEditorStore((state) => state.selectedKeyframeId)
  const updateKeyframe = useEditorStore((state) => state.updateKeyframe)
  const index = layer.keyframes.findIndex((keyframe) => keyframe.id === selectedKeyframeId)
  const keyframe = layer.keyframes[index]
  if (!keyframe) return null

  return (
    <>
      <h3 className={styles.section}>Keyframe at {formatPercent(keyframe.progress)}</h3>
      <SelectField
        label="Easing"
        value={keyframe.ease}
        options={EASE_OPTIONS}
        onChange={(ease) => {
          updateKeyframe(layer.id, keyframe.id, { ease })
        }}
      />
      <svg
        className={styles.curve}
        viewBox={`0 0 ${String(CURVE_WIDTH)} ${String(CURVE_HEIGHT)}`}
        aria-hidden="true"
      >
        <polyline
          points={easeCurvePoints(keyframe.ease, CURVE_WIDTH, CURVE_HEIGHT, CURVE_SAMPLES)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {index === 0 && (
        <p className={styles.hint}>
          This is the first keyframe. Easing shapes the way into a keyframe from the one before it,
          so it has no effect here.
        </p>
      )}
    </>
  )
}
