import { useRef } from 'react'
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
  const removeLayer = useEditorStore((state) => state.removeLayer)
  const selectButtons = useRef<Record<string, HTMLButtonElement | null>>({})
  const firstAddButton = useRef<HTMLButtonElement>(null)

  const handleAdd = (type: LayerType): void => {
    addLayer(createLayer(createId(), type, nextLayerName(project, type)))
  }

  // The last layer is drawn on top, so it is listed first.
  const topFirst = [...project.layers].reverse()

  /** Deletes a layer. Focus moves to a neighbour first, so keyboard users do not lose their place. */
  const handleDelete = (index: number): void => {
    const layer = topFirst[index]
    if (!layer) return
    const neighbour = topFirst[index + 1] ?? topFirst[index - 1]
    const target = neighbour ? selectButtons.current[neighbour.id] : firstAddButton.current
    target?.focus()
    removeLayer(layer.id)
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Layers</h2>
      <div className={styles.actions}>
        {LAYER_TYPES.map((type, index) => (
          <button
            key={type}
            ref={index === 0 ? firstAddButton : undefined}
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
          {topFirst.map((layer, index) => (
            <li key={layer.id} className={styles.row}>
              <button
                ref={(element) => {
                  selectButtons.current[layer.id] = element
                }}
                type="button"
                className={styles.item}
                aria-pressed={layer.id === selectedLayerId}
                onClick={() => {
                  select(layer.id)
                }}
              >
                <span>{layer.name}</span>{' '}
                <span className={styles.type}>{LAYER_TYPE_LABELS[layer.type]}</span>
              </button>
              <button
                type="button"
                className={styles.delete}
                aria-label={`Delete ${layer.name}`}
                title={`Delete ${layer.name}`}
                onClick={() => {
                  handleDelete(index)
                }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
