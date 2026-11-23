import type { EaseName, Layer } from '../engine/types'
import { backgroundLayer, key, project, rect, text } from './build'
import type { Template } from './types'

function card(
  id: string,
  name: string,
  y: number,
  color: string,
  from: number,
  to: number,
  ease: EaseName,
): Layer {
  return rect(id, name, { x: 10, y, width: 80, height: 16 }, color, {
    radius: 12,
    keyframes: [
      key(`${id}-start`, from, { translateX: 120, opacity: 0 }),
      key(`${id}-in`, to, { translateX: 0, opacity: 1 }, ease),
    ],
  })
}

export const slideInCards: Template = {
  id: 'slide-in-cards',
  name: 'Slide-in cards',
  description: 'Three cards slide in from the right one after another under a heading.',
  project: project('Slide-in cards', 4, [
    backgroundLayer('#111827'),
    text(
      'heading',
      'Heading',
      { x: 10, y: 8, width: 80, height: 12 },
      'Three steps',
      64,
      '#f9fafb',
      [key('heading-start', 0, { opacity: 0 }), key('heading-in', 0.15, { opacity: 1 }, 'easeOut')],
    ),
    card('card-1', 'Card 1', 25, '#4f46e5', 0.1, 0.35, 'power2Out'),
    card('card-2', 'Card 2', 45, '#0891b2', 0.3, 0.55, 'easeOut'),
    card('card-3', 'Card 3', 65, '#059669', 0.5, 0.75, 'sineInOut'),
  ]),
}
