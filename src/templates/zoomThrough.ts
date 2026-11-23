import { backgroundLayer, key, project, rect, text } from './build'
import type { Template } from './types'

export const zoomThrough: Template = {
  id: 'zoom-through',
  name: 'Zoom through',
  description: 'Two portals grow past the viewer until a message appears on the other side.',
  project: project('Zoom through', 6, [
    backgroundLayer('#020617'),
    rect('portal', 'Portal', { x: 40, y: 35, width: 20, height: 30 }, '#6366f1', {
      radius: 20,
      keyframes: [
        key('portal-start', 0, { scale: 1, opacity: 1 }),
        key('portal-grow', 0.6, { scale: 14 }, 'power2In'),
        key('portal-gone', 0.85, { scale: 30, opacity: 0 }, 'easeIn'),
      ],
    }),
    rect('inner-portal', 'Inner portal', { x: 44, y: 41, width: 12, height: 18 }, '#020617', {
      radius: 12,
      keyframes: [
        key('inner-start', 0, { scale: 1 }),
        key('inner-grow', 0.7, { scale: 20 }, 'power2In'),
      ],
    }),
    text(
      'message',
      'Message',
      { x: 15, y: 40, width: 70, height: 20 },
      'You made it through',
      80,
      '#e0e7ff',
      [
        key('message-start', 0.6, { opacity: 0, scale: 0.6 }),
        key('message-in', 1, { opacity: 1, scale: 1 }, 'power2Out'),
      ],
    ),
  ]),
}
