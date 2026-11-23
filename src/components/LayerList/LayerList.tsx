import { LAYER_TYPE_LABELS, createLayer, nextLayerName } from '../../engine/document'
import { LAYER_TYPES, type LayerType } from '../../engine/types'
import { createId } from '../../lib/id'
import { selectProject, useEditorStore } from '../../store/editorStore'
import styles from './LayerList.module.css'

export function LayerList() {
  const project = useEditorStore(selectProject)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const select = useEditorStore((state) => state.select)
  const addLayer = useEditorStore((state) => state.addLayer)

  const handleAdd = (type: LayerType): void => {
    addLayer(createLayer(createId(), type, nextLayerName(project, type)))
  }

  // The last layer is drawn on top, so it is listed first.
  const topFirst = [...project.layers].reverse()

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Layers</h2>
      <div className={styles.actions}>
        {LAYER_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={styles.button}
            onClick={() => {
              handleAdd(type)
            }}
          >
            Add {LAYER_TYPE_LABELS[type].toLowerCase()}
          </button>
        ))}
      </div>
      {topFirst.length === 0 ? (
        <p className={styles.empty}>No layers yet. Add one above.</p>
      ) : (
        <ul className={styles.list}>
          {topFirst.map((layer) => (
            <li key={layer.id}>
              <button
                type="button"
                className={styles.item}
                aria-pressed={layer.id === selectedLayerId}
                onClick={() => {
                  select(layer.id)
                }}
              >
                <span>{layer.name}</span>
                <span className={styles.type}>{LAYER_TYPE_LABELS[layer.type]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
