import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { createLayer, createProject } from '../../engine/document'
import type { Project } from '../../engine/types'
import { validateProject } from '../../engine/validate'
import {
  createInitialData,
  selectCanUndo,
  selectProject,
  useEditorStore,
} from '../../store/editorStore'
import { TEMPLATES } from '../../templates'
import { NewProjectDialog } from './NewProjectDialog'

function current(): Project {
  return selectProject(useEditorStore.getState())
}

function layerIds(project: Project): string[] {
  return project.layers.map((layer) => layer.id)
}

function withLayers(count: number): Project {
  return {
    ...createProject(),
    name: 'Mine',
    layers: Array.from({ length: count }, (_, index) =>
      createLayer(`mine-${String(index)}`, 'rect', `Box ${String(index)}`),
    ),
  }
}

function open(project: Project = createProject(), onClose: () => void = () => undefined) {
  useEditorStore.setState(createInitialData(project))
  return render(<NewProjectDialog onClose={onClose} />)
}

const fadeUp = TEMPLATES[0]
if (!fadeUp) throw new Error('no templates')

describe('NewProjectDialog choices', () => {
  it('is a dialog named New project', () => {
    open()
    expect(screen.getByRole('dialog', { name: 'New project' })).toBeInTheDocument()
  })

  it('offers a blank project and each template with its name and description', () => {
    open()
    expect(screen.getByRole('button', { name: /Blank project/ })).toBeInTheDocument()
    expect(screen.getByText('An empty scene with no layers.')).toBeInTheDocument()
    for (const template of TEMPLATES) {
      expect(screen.getByRole('button', { name: new RegExp(template.name) })).toBeInTheDocument()
      expect(screen.getByText(template.description)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })

  it('starts with focus on the first choice', () => {
    open()
    expect(screen.getByRole('button', { name: /Blank project/ })).toHaveFocus()
  })
})

describe('NewProjectDialog starting a project', () => {
  it('loads a template at once when the current project has no layers', async () => {
    const onClose = vi.fn()
    open(createProject(), onClose)
    await userEvent.click(screen.getByRole('button', { name: /Fade-up title/ }))
    expect(current().name).toBe('Fade-up title')
    expect(current().layers).toHaveLength(fadeUp.project.layers.length)
    expect(screen.queryByText('Replace the current project?')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(useEditorStore.getState().notice).toBe('Started a new project from "Fade-up title".')
  })

  it('loads a project that passes validation', async () => {
    open()
    await userEvent.click(screen.getByRole('button', { name: /Zoom through/ }))
    expect(validateProject(current()).ok).toBe(true)
  })

  it('starts a blank project', async () => {
    const onClose = vi.fn()
    open({ ...createProject(), name: 'Named', sceneLength: 9 }, onClose)
    await userEvent.click(screen.getByRole('button', { name: /Blank project/ }))
    expect(current()).toEqual(createProject())
    expect(useEditorStore.getState().notice).toBe('Started a new blank project.')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('puts the playhead back at the start and clears the selection', async () => {
    open(withLayers(1))
    act(() => {
      useEditorStore.getState().setPlayhead(0.4)
      useEditorStore.getState().select('mine-0')
    })
    await userEvent.click(screen.getByRole('button', { name: /Slide-in cards/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Replace project' }))
    expect(useEditorStore.getState().playhead).toBe(0)
    expect(useEditorStore.getState().selectedLayerId).toBeNull()
  })

  it('gives the loaded layers new ids, not the ones in the template', async () => {
    open()
    await userEvent.click(screen.getByRole('button', { name: /Fade-up title/ }))
    const templateIds = new Set(layerIds(fadeUp.project))
    expect(layerIds(current()).some((id) => templateIds.has(id))).toBe(false)
    expect(fadeUp.project.layers[1]?.id).toBe('title')
  })

  it('loading the same template twice shares no ids', async () => {
    open()
    await userEvent.click(screen.getByRole('button', { name: /Fade-up title/ }))
    const first = current()
    // The dialog stays open here (onClose does nothing), and the project now has layers.
    await userEvent.click(screen.getByRole('button', { name: /Fade-up title/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Replace project' }))
    const idsOf = (project: Project): string[] => [
      ...layerIds(project),
      ...project.layers.flatMap((layer) => layer.keyframes.map((keyframe) => keyframe.id)),
    ]
    const firstIds = new Set(idsOf(first))
    const secondIds = idsOf(current())
    expect(current()).not.toBe(first)
    expect(secondIds).toHaveLength(firstIds.size)
    expect(secondIds.some((id) => firstIds.has(id))).toBe(false)
  })
})

describe('NewProjectDialog confirmation', () => {
  it('asks first when the project has layers, and changes nothing yet', async () => {
    const onClose = vi.fn()
    const project = withLayers(2)
    open(project, onClose)
    await userEvent.click(screen.getByRole('button', { name: /Parallax layers/ }))
    expect(screen.getByText('Replace the current project?')).toBeInTheDocument()
    expect(screen.getByText(/replaces your 2 layers with/)).toHaveTextContent('Parallax layers')
    expect(current()).toBe(project)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('says "1 layer" for a single layer', async () => {
    open(withLayers(1))
    await userEvent.click(screen.getByRole('button', { name: /Parallax layers/ }))
    expect(screen.getByText(/replaces your 1 layer with/)).toBeInTheDocument()
  })

  it('puts focus on Cancel, the safe choice', async () => {
    open(withLayers(1))
    await userEvent.click(screen.getByRole('button', { name: /Zoom through/ }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('Cancel goes back to the choices with focus on the one chosen, and changes nothing', async () => {
    const onClose = vi.fn()
    const project = withLayers(1)
    open(project, onClose)
    await userEvent.click(screen.getByRole('button', { name: /Zoom through/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: /Zoom through/ })).toHaveFocus()
    expect(screen.queryByText('Replace the current project?')).not.toBeInTheDocument()
    expect(current()).toBe(project)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Replace project loads the template and closes the dialog', async () => {
    const onClose = vi.fn()
    open(withLayers(2), onClose)
    await userEvent.click(screen.getByRole('button', { name: /Zoom through/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Replace project' }))
    expect(current().name).toBe('Zoom through')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('is one undo step: Undo brings the previous project back', async () => {
    const project = withLayers(2)
    open(project)
    await userEvent.click(screen.getByRole('button', { name: /Zoom through/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Replace project' }))
    expect(selectCanUndo(useEditorStore.getState())).toBe(true)
    act(() => {
      useEditorStore.getState().undo()
    })
    expect(current()).toBe(project)
    expect(selectCanUndo(useEditorStore.getState())).toBe(false)
  })

  it('starting from a blank project over a project with layers also asks first', async () => {
    open(withLayers(1))
    await userEvent.click(screen.getByRole('button', { name: /Blank project/ }))
    expect(screen.getByText('Replace the current project?')).toBeInTheDocument()
  })
})

describe('NewProjectDialog modal behaviour', () => {
  it('closes on Escape, also while it asks for confirmation', async () => {
    const onClose = vi.fn()
    open(withLayers(1), onClose)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: /Zoom through/ }))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('keeps Tab inside the dialog', async () => {
    open()
    const last = screen.getByRole('button', { name: /Slide-in cards/ })
    last.focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('gives focus back to the element that had it before it opened', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = open()
    expect(opener).not.toHaveFocus()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
