import { useMemo } from 'react'
import { generateHtml } from '../../engine/codegen/html'
import { supportsScrollDrivenAnimations } from '../../lib/browserSupport'
import { selectProject, useEditorStore } from '../../store/editorStore'
import styles from './BrowserPreview.module.css'

/**
 * Runs the exported single-file HTML in an iframe, so it is the real CSS and
 * real scrolling: scroll inside the frame to play the animation. The frame is
 * sandboxed, so the page cannot run scripts. When this browser cannot do
 * scroll-driven animations the frame still shows what such a browser would
 * see (the final layout), and a message says why nothing moves.
 */
export function BrowserPreview() {
  const project = useEditorStore(selectProject)
  const html = useMemo(() => generateHtml(project), [project])
  const supported = useMemo(() => supportsScrollDrivenAnimations(), [])

  return (
    <div className={styles.preview}>
      {!supported && (
        <p role="status" className={styles.warning}>
          This browser does not support CSS scroll-driven animations (animation-timeline), so the
          page below shows the fallback: the final layout, without motion. Open ScrollStudio in a
          browser that supports them to scroll through the real animation, or use the scrub preview
          in the editor.
        </p>
      )}
      <iframe
        className={styles.frame}
        title="Browser preview of the exported CSS"
        sandbox=""
        srcDoc={html}
      />
    </div>
  )
}
