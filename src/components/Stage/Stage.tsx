import type { CSSProperties } from 'react'
import { selectProject, useEditorStore } from '../../store/editorStore'
import styles from './Stage.module.css'
import { StageLayer } from './StageLayer'

export function Stage() {
  const project = useEditorStore(selectProject)
  const playhead = useEditorStore((state) => state.playhead)
  const { width, height } = project.aspectRatio
  const frameStyle = { '--ratio': width / height } as CSSProperties

  return (
    <div className={styles.viewport}>
      <div className={styles.frame} style={frameStyle} data-stage-frame="">
        {project.layers.map((layer) => (
          <StageLayer key={layer.id} layer={layer} progress={playhead} />
        ))}
      </div>
    </div>
  )
}
