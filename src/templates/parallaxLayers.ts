import { backgroundLayer, key, project, rect, text } from './build'
import type { Template } from './types'

export const parallaxLayers: Template = {
  id: 'parallax-layers',
  name: 'Parallax layers',
  description: 'Hills move at different speeds while the sun sets and the headline fades.',
  project: project('Parallax layers', 5, [
    backgroundLayer('#0b1d3a'),
    rect('sun', 'Sun', { x: 70, y: 15, width: 9, height: 16 }, '#fbbf24', {
      radius: 80,
      keyframes: [
        key('sun-start', 0, { translateY: 0, scale: 1 }),
        key('sun-set', 1, { translateY: 150, scale: 0.8 }, 'power2In'),
      ],
    }),
    rect('far-hills', 'Far hills', { x: 0, y: 55, width: 100, height: 45 }, '#1d4e89', {
      keyframes: [key('far-start', 0, { translateY: 0 }), key('far-end', 1, { translateY: -20 })],
    }),
    rect('near-hills', 'Near hills', { x: 0, y: 70, width: 100, height: 30 }, '#14532d', {
      keyframes: [
        key('near-start', 0, { translateY: 0 }),
        key('near-end', 1, { translateY: -60 }, 'easeInOut'),
      ],
    }),
    text(
      'headline',
      'Headline',
      { x: 10, y: 20, width: 80, height: 20 },
      'Parallax',
      110,
      '#f8fafc',
      [
        key('headline-start', 0, { opacity: 1 }),
        key('headline-out', 0.5, { opacity: 0 }, 'sineInOut'),
      ],
    ),
  ]),
}
