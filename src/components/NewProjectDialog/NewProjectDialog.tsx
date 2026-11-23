import { useEffect, useRef, useState } from 'react'
import { createProject } from '../../engine/document'
import type { Project } from '../../engine/types'
import { selectProject, useEditorStore } from '../../store/editorStore'
import { TEMPLATES } from '../../templates'
import { instantiateProject } from '../../templates/instantiate'
import { Modal } from '../ui/Modal'
import styles from './NewProjectDialog.module.css'

interface Choice {
  id: string
  name: string
  description: string
  /** Makes a new project every time it is called, so nothing is ever shared. */
  create: () => Project
}

const CHOICES: readonly Choice[] = [
  {
    id: 'blank',
    name: 'Blank project',
    description: 'An empty scene with no layers.',
    create: createProject,
  },
  ...TEMPLATES.map((template): Choice => ({
    id: template.id,
    name: template.name,
    description: template.description,
    create: () => instantiateProject(template.project),
  })),
]

interface NewProjectDialogProps {
  onClose: () => void
}

/**
 * Starts a new project from a blank scene or a template. When the current
 * project has layers, the choice is confirmed first. The new project replaces
 * the old one as a single edit, so Undo brings the old one back.
 */
export function NewProjectDialog({ onClose }: NewProjectDialogProps) {
  const layerCount = useEditorStore(selectProject).layers.length
  const replaceProject = useEditorStore((state) => state.replaceProject)
  const setPlayhead = useEditorStore((state) => state.setPlayhead)
  const setNotice = useEditorStore((state) => state.setNotice)
  const [pending, setPending] = useState<Choice | null>(null)
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const cancelRef = useRef<HTMLButtonElement>(null)
  const lastChosen = useRef<string | null>(null)

  useEffect(() => {
    if (pending) cancelRef.current?.focus()
    else if (lastChosen.current !== null) optionRefs.current[lastChosen.current]?.focus()
  }, [pending])

  const start = (choice: Choice): void => {
    replaceProject(choice.create())
    setPlayhead(0)
    setNotice(
      choice.id === 'blank'
        ? 'Started a new blank project.'
        : `Started a new project from "${choice.name}".`,
    )
    onClose()
  }

  const choose = (choice: Choice): void => {
    lastChosen.current = choice.id
    if (layerCount > 0) setPending(choice)
    else start(choice)
  }

  return (
    <Modal title="New project" onClose={onClose}>
      {pending ? (
        <div className={styles.body}>
          <h3 className={styles.question}>Replace the current project?</h3>
          <p className={styles.text}>
            This replaces your {layerCount} {layerCount === 1 ? 'layer' : 'layers'} with “
            {pending.name}”. You can undo it afterwards.
          </p>
          <div className={styles.actions}>
            <button
              ref={cancelRef}
              type="button"
              className={styles.button}
              onClick={() => {
                setPending(null)
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                start(pending)
              }}
            >
              Replace project
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <p className={styles.text}>Start from a blank scene or from a template.</p>
          <ul className={styles.list}>
            {CHOICES.map((choice, index) => (
              <li key={choice.id}>
                <button
                  ref={(element) => {
                    optionRefs.current[choice.id] = element
                  }}
                  type="button"
                  className={styles.option}
                  data-autofocus={index === 0 ? '' : undefined}
                  onClick={() => {
                    choose(choice)
                  }}
                >
                  <span className={styles.name}>{choice.name}</span>
                  <span className={styles.description}>{choice.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
