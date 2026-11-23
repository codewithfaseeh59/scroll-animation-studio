import { backgroundLayer, key, project, text } from './build'
import type { Template } from './types'

export const fadeUpTitle: Template = {
  id: 'fade-up-title',
  name: 'Fade-up title',
  description: 'A title and a subtitle that fade in while sliding up as you scroll.',
  project: project('Fade-up title', 3, [
    backgroundLayer('#0f172a'),
    text(
      'title',
      'Title',
      { x: 10, y: 38, width: 80, height: 24 },
      'Scroll to begin',
      90,
      '#f8fafc',
      [
        key('title-start', 0, { opacity: 0, translateY: 40 }),
        key('title-in', 0.35, { opacity: 1, translateY: 0 }, 'power2Out'),
        key('title-hold', 0.8, { opacity: 1 }),
        key('title-out', 1, { opacity: 0, translateY: -20 }, 'easeIn'),
      ],
    ),
    text(
      'subtitle',
      'Subtitle',
      { x: 20, y: 62, width: 60, height: 10 },
      'A scroll-driven animation',
      36,
      '#94a3b8',
      [
        key('subtitle-start', 0.2, { opacity: 0, translateY: 30 }),
        key('subtitle-in', 0.55, { opacity: 1, translateY: 0 }, 'easeOut'),
      ],
    ),
  ]),
}
