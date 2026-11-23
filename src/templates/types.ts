import type { Project } from '../engine/types'

export interface Template {
  id: string
  name: string
  /** One line that says what the template shows. */
  description: string
  project: Project
}
