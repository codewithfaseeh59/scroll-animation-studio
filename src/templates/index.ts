import { fadeUpTitle } from './fadeUpTitle'
import { parallaxLayers } from './parallaxLayers'
import { slideInCards } from './slideInCards'
import type { Template } from './types'
import { zoomThrough } from './zoomThrough'

export type { Template } from './types'

export const TEMPLATES: readonly Template[] = [
  fadeUpTitle,
  parallaxLayers,
  zoomThrough,
  slideInCards,
]
