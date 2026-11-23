import type { Layer } from '../../engine/types'
import { MIN_SIZE } from '../../lib/geometry'
import { selectSelectedLayer, useEditorStore } from '../../store/editorStore'
import { NumberField } from '../ui/NumberField'
import { TextField } from '../ui/TextField'
import { AnimationFields } from './AnimationFields'
import styles from './Inspector.module.css'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value)
}

function LayerFields({ layer }: { layer: Layer }) {
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const { base, style } = layer

  return (
    <div className={styles.fields}>
      <TextField
        label="Name"
        value={layer.name}
        onCommit={(name) => {
          updateLayer(layer.id, { name })
        }}
      />

      <AnimationFields layer={layer} />

      <h3 className={styles.section}>Position and size</h3>
      <div className={styles.grid}>
        <NumberField
          label="X (%)"
          value={base.x}
          onCommit={(x) => {
            updateLayer(layer.id, { base: { x } })
          }}
        />
        <NumberField
          label="Y (%)"
          value={base.y}
          onCommit={(y) => {
            updateLayer(layer.id, { base: { y } })
          }}
        />
        <NumberField
          label="Width (%)"
          value={base.width}
          min={MIN_SIZE}
          onCommit={(width) => {
            updateLayer(layer.id, { base: { width } })
          }}
        />
        <NumberField
          label="Height (%)"
          value={base.height}
          min={MIN_SIZE}
          onCommit={(height) => {
            updateLayer(layer.id, { base: { height } })
          }}
        />
      </div>

      <h3 className={styles.section}>Style</h3>
      {layer.type === 'text' && (
        <>
          <TextField
            label="Text"
            value={style.text}
            onCommit={(text) => {
              updateLayer(layer.id, { style: { text } })
            }}
          />
          <NumberField
            label="Font size"
            value={style.fontSize}
            min={1}
            onCommit={(fontSize) => {
              updateLayer(layer.id, { style: { fontSize } })
            }}
          />
        </>
      )}
      {layer.type === 'image' && (
        <TextField
          label="Image URL"
          value={style.src}
          onCommit={(src) => {
            updateLayer(layer.id, { style: { src } })
          }}
        />
      )}
      {layer.type !== 'image' && (
        <TextField
          label="Color"
          value={style.color}
          isValid={isHexColor}
          onCommit={(color) => {
            updateLayer(layer.id, { style: { color } })
          }}
        />
      )}
      {layer.type !== 'text' && (
        <NumberField
          label="Corner radius"
          value={style.radius}
          min={0}
          onCommit={(radius) => {
            updateLayer(layer.id, { style: { radius } })
          }}
        />
      )}
    </div>
  )
}

export function Inspector() {
  const layer = useEditorStore(selectSelectedLayer)

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Inspector</h2>
      {layer ? (
        <LayerFields key={layer.id} layer={layer} />
      ) : (
        <p className={styles.empty}>Select a layer to edit its properties.</p>
      )}
    </div>
  )
}
